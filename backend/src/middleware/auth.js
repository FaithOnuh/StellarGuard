const jwt = require('jsonwebtoken');
const db  = require('../db');

const auth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Invalid or expired token' });
  try {
    req.user = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Verify caller is a member of req.params.orgId or req.body.org_id
const orgMember = async (req, res, next) => {
  const orgId = req.params.orgId || req.body.org_id || req.query.treasury_id;
  if (!orgId) return res.status(400).json({ error: 'org_id required' });
  try {
    const { rows } = await db.query('SELECT role, signing_weight FROM members WHERE org_id=$1 AND user_id=$2', [orgId, req.user.id]);
    if (!rows.length) return res.status(403).json({ error: 'Not a member of this organisation' });
    req.membership = rows[0];
    req.orgId = orgId;
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const orgAdmin = async (req, res, next) => {
  await orgMember(req, res, () => {
    if (!['owner', 'admin'].includes(req.membership?.role)) return res.status(403).json({ error: 'Admin access required' });
    next();
  });
};

const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
};

module.exports = { auth, orgMember, orgAdmin, adminOnly };
