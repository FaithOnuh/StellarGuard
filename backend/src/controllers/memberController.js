const { validationResult } = require('express-validator');
const db      = require('../db');
const stellar = require('../services/stellar');

exports.add = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { org_id, user_email, role = 'signer', signing_weight = 1 } = req.body;
  try {
    // Find user by email
    const userRes = await db.query('SELECT id FROM users WHERE email=$1', [user_email]);
    if (!userRes.rows.length) return res.status(404).json({ error: 'User not found' });
    const newUserId = userRes.rows[0].id;

    // Add to members table
    const { rows } = await db.query(
      'INSERT INTO members (org_id, user_id, role, signing_weight) VALUES ($1,$2,$3,$4) RETURNING *',
      [org_id, newUserId, role, signing_weight]
    );

    // Add their wallet as a Stellar signer on the treasury
    const orgRes    = await db.query('SELECT treasury_secret_enc FROM organisations WHERE id=$1', [org_id]);
    const walletRes = await db.query('SELECT public_key FROM wallets WHERE user_id=$1', [newUserId]);
    if (orgRes.rows.length && walletRes.rows.length) {
      const secret = stellar.decrypt(orgRes.rows[0].treasury_secret_enc);
      await stellar.addSigner({ treasurySecret: secret, signerPublicKey: walletRes.rows[0].public_key, weight: signing_weight });
    }

    await db.query('INSERT INTO audit_log (org_id, actor_id, action, entity_type, entity_id) VALUES ($1,$2,$3,$4,$5)',
      [org_id, req.user.id, 'member_added', 'member', rows[0].id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'User is already a member' });
    res.status(500).json({ error: err.message });
  }
};

exports.list = async (req, res) => {
  const { rows } = await db.query(
    'SELECT m.*, u.email, u.full_name, w.public_key AS wallet FROM members m JOIN users u ON u.id=m.user_id LEFT JOIN wallets w ON w.user_id=m.user_id WHERE m.org_id=$1 ORDER BY m.added_at',
    [req.orgId]
  );
  res.json(rows);
};

exports.remove = async (req, res) => {
  try {
    const { rows } = await db.query('SELECT m.*, w.public_key FROM members m LEFT JOIN wallets w ON w.user_id=m.user_id WHERE m.id=$1 AND m.org_id=$2', [req.params.id, req.orgId]);
    if (!rows.length) return res.status(404).json({ error: 'Member not found' });
    if (rows[0].role === 'owner') return res.status(400).json({ error: 'Cannot remove the owner' });

    await db.query('DELETE FROM members WHERE id=$1', [req.params.id]);

    // Revoke Stellar signer
    if (rows[0].public_key) {
      const orgRes = await db.query('SELECT treasury_secret_enc FROM organisations WHERE id=$1', [req.orgId]);
      const secret = stellar.decrypt(orgRes.rows[0].treasury_secret_enc);
      await stellar.removeSigner({ treasurySecret: secret, signerPublicKey: rows[0].public_key });
    }

    await db.query('INSERT INTO audit_log (org_id, actor_id, action, entity_type, entity_id) VALUES ($1,$2,$3,$4,$5)',
      [req.orgId, req.user.id, 'member_removed', 'member', req.params.id]);
    res.json({ message: 'Member removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
