const db    = require('../db');
const cache = require('../services/redis');

exports.health = async (req, res) => {
  const checks = { api: 'ok', db: 'unknown', redis: 'unknown', stellar: 'unknown' };
  try { await db.query('SELECT 1'); checks.db = 'ok'; } catch { checks.db = 'error'; }
  try { await cache.set('__health', '1'); checks.redis = 'ok'; } catch { checks.redis = 'unavailable'; }
  try {
    const r = await fetch(process.env.STELLAR_HORIZON_URL);
    checks.stellar = r.ok ? 'ok' : 'degraded';
  } catch { checks.stellar = 'error'; }
  const ok = Object.values(checks).every((v) => ['ok', 'unavailable'].includes(v));
  res.json({ status: ok ? 'ok' : 'degraded', checks, ts: new Date().toISOString() });
};

exports.auditLog = async (req, res) => {
  const { treasury_id, limit = 50, offset = 0 } = req.query;
  const { rows } = await db.query(
    'SELECT a.*, u.full_name AS actor_name FROM audit_log a LEFT JOIN users u ON u.id=a.actor_id WHERE a.org_id=$1 ORDER BY a.created_at DESC LIMIT $2 OFFSET $3',
    [treasury_id, parseInt(limit), parseInt(offset)]
  );
  res.json(rows);
};
