const { validationResult } = require('express-validator');
const db      = require('../db');
const stellar = require('../services/stellar');
const cache   = require('../services/redis');

exports.create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { name, threshold_med = 2, threshold_high = 3 } = req.body;
  try {
    const { publicKey, encryptedSecret } = await stellar.generateWallet();
    const secret = stellar.decrypt(encryptedSecret);
    await stellar.setThresholds({ treasurySecret: secret, low: 1, med: threshold_med, high: threshold_high });

    const { rows } = await db.query(
      'INSERT INTO organisations (name, owner_id, treasury_public_key, treasury_secret_enc, threshold_med, threshold_high) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [name, req.user.id, publicKey, encryptedSecret, threshold_med, threshold_high]
    );
    const org = rows[0];

    await db.query('INSERT INTO members (org_id, user_id, role, signing_weight) VALUES ($1,$2,$3,$4)', [org.id, req.user.id, 'owner', threshold_high]);

    const ownerWallet = await db.query('SELECT public_key FROM wallets WHERE user_id=$1', [req.user.id]);
    if (ownerWallet.rows.length) {
      await stellar.addSigner({ treasurySecret: secret, signerPublicKey: ownerWallet.rows[0].public_key, weight: threshold_high });
    }

    await db.query('INSERT INTO audit_log (org_id, actor_id, action, entity_type, entity_id) VALUES ($1,$2,$3,$4,$5)',
      [org.id, req.user.id, 'treasury_created', 'organisation', org.id]);

    res.status(201).json({ ...org, treasury_secret_enc: undefined });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Treasury creation failed' });
  }
};

exports.get = async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM organisations WHERE id=$1', [req.params.orgId]);
    if (!rows.length) return res.status(404).json({ error: 'Treasury not found' });
    const org = rows[0];
    const cacheKey = `balance:${org.treasury_public_key}`;
    const cached   = await cache.get(cacheKey);
    const balances = cached ? JSON.parse(cached) : await stellar.getBalances(org.treasury_public_key);
    if (!cached) await cache.set(cacheKey, JSON.stringify(balances));
    res.json({ ...org, balances, treasury_secret_enc: undefined });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSigners = async (req, res) => {
  try {
    const { rows } = await db.query('SELECT treasury_public_key FROM organisations WHERE id=$1', [req.params.orgId]);
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(await stellar.getSigners(rows[0].treasury_public_key));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.list = async (req, res) => {
  const { rows } = await db.query(
    'SELECT o.id,o.name,o.treasury_public_key,o.threshold_med,o.threshold_high,o.created_at,m.role FROM organisations o JOIN members m ON m.org_id=o.id WHERE m.user_id=$1',
    [req.user.id]
  );
  res.json(rows);
};
