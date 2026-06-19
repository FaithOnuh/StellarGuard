const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const db     = require('../db');
const stellar = require('../services/stellar');

const sign = (user) => jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { email, password, full_name } = req.body;
  try {
    const exists = await db.query('SELECT id FROM users WHERE email=$1', [email]);
    if (exists.rows.length) return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 12);
    const { rows } = await db.query('INSERT INTO users (email, password_hash, full_name) VALUES ($1,$2,$3) RETURNING id,email,full_name', [email, hash, full_name]);
    const user = rows[0];

    const { publicKey, encryptedSecret } = await stellar.generateWallet();
    await db.query('INSERT INTO wallets (user_id, public_key, encrypted_secret) VALUES ($1,$2,$3)', [user.id, publicKey, encryptedSecret]);

    res.status(201).json({ token: sign(user), user: { ...user, wallet: publicKey } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
};

exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { email, password } = req.body;
  try {
    const { rows } = await db.query('SELECT * FROM users WHERE email=$1', [email]);
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: 'Invalid email or password' });
    const wallet = await db.query('SELECT public_key FROM wallets WHERE user_id=$1', [user.id]);
    res.json({ token: sign(user), user: { id: user.id, email: user.email, full_name: user.full_name, wallet: wallet.rows[0]?.public_key } });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
};

exports.me = async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT u.id,u.email,u.full_name,w.public_key AS wallet FROM users u LEFT JOIN wallets w ON w.user_id=u.id WHERE u.id=$1',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};
