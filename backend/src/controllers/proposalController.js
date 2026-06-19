const { validationResult } = require('express-validator');
const db      = require('../db');
const stellar = require('../services/stellar');
const cache   = require('../services/redis');

exports.create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { org_id, title, description, to_address, amount, asset = 'XLM' } = req.body;
  try {
    const { rows } = await db.query(
      'INSERT INTO proposals (org_id, proposer_id, title, description, to_address, amount, asset) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [org_id, req.user.id, title, description, to_address, amount, asset]
    );
    await db.query('INSERT INTO audit_log (org_id, actor_id, action, entity_type, entity_id) VALUES ($1,$2,$3,$4,$5)',
      [org_id, req.user.id, 'proposal_created', 'proposal', rows[0].id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.list = async (req, res) => {
  const { treasury_id, status } = req.query;
  const params = [treasury_id];
  let query = 'SELECT p.*, u.full_name AS proposer_name FROM proposals p JOIN users u ON u.id=p.proposer_id WHERE p.org_id=$1';
  if (status) { query += ' AND p.status=$2'; params.push(status); }
  query += ' ORDER BY p.created_at DESC';
  const { rows } = await db.query(query, params);
  res.json(rows);
};

exports.vote = async (req, res) => {
  const { vote } = req.body; // 'approve' | 'reject'
  if (!['approve', 'reject'].includes(vote)) return res.status(400).json({ error: 'Vote must be approve or reject' });
  try {
    const propRes = await db.query('SELECT * FROM proposals WHERE id=$1', [req.params.id]);
    const proposal = propRes.rows[0];
    if (!proposal) return res.status(404).json({ error: 'Proposal not found' });
    if (proposal.status !== 'pending') return res.status(400).json({ error: 'Proposal is not pending' });
    if (new Date(proposal.expires_at) < new Date()) {
      await db.query("UPDATE proposals SET status='expired' WHERE id=$1", [req.params.id]);
      return res.status(400).json({ error: 'Proposal has expired' });
    }

    // Record vote (unique per voter)
    await db.query('INSERT INTO votes (proposal_id, voter_id, vote, weight) VALUES ($1,$2,$3,$4)',
      [req.params.id, req.user.id, vote, req.membership?.signing_weight || 1]);

    // Update tallies
    const col = vote === 'approve' ? 'votes_for' : 'votes_against';
    await db.query(`UPDATE proposals SET ${col} = ${col} + $1, updated_at=NOW() WHERE id=$2`,
      [req.membership?.signing_weight || 1, req.params.id]);

    // Reload to check threshold
    const updated = (await db.query('SELECT p.*, o.threshold_med, o.treasury_secret_enc FROM proposals p JOIN organisations o ON o.id=p.org_id WHERE p.id=$1', [req.params.id])).rows[0];

    let hash = null;
    if (updated.votes_for >= updated.threshold_med) {
      // Auto-execute
      const secret = stellar.decrypt(updated.treasury_secret_enc);
      hash = await stellar.sendPayment({ fromSecret: secret, toAddress: updated.to_address, amount: updated.amount, asset: updated.asset, memo: updated.title });
      await db.query("UPDATE proposals SET status='executed', stellar_hash=$1, updated_at=NOW() WHERE id=$2", [hash, req.params.id]);
      await cache.del(`balance:${(await db.query('SELECT treasury_public_key FROM organisations WHERE id=$1', [updated.org_id])).rows[0]?.treasury_public_key}`);
      await db.query('INSERT INTO audit_log (org_id, actor_id, action, entity_type, entity_id, metadata) VALUES ($1,$2,$3,$4,$5,$6)',
        [updated.org_id, req.user.id, 'proposal_executed', 'proposal', req.params.id, JSON.stringify({ hash })]);
    } else if (updated.votes_against >= updated.threshold_med) {
      await db.query("UPDATE proposals SET status='rejected', updated_at=NOW() WHERE id=$1", [req.params.id]);
    }

    res.json({ message: `Vote '${vote}' recorded`, executed: !!hash, stellar_hash: hash });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'You already voted on this proposal' });
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
