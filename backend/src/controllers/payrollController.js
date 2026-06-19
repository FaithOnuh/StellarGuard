const { validationResult } = require('express-validator');
const db = require('../db');

exports.create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { org_id, employee_name, employee_address, amount, asset = 'XLM', frequency = 'monthly', next_run_at } = req.body;
  try {
    const { rows } = await db.query(
      'INSERT INTO payroll_schedules (org_id, employee_name, employee_address, amount, asset, frequency, next_run_at) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *',
      [org_id, employee_name, employee_address, amount, asset, frequency, next_run_at]
    );
    await db.query('INSERT INTO audit_log (org_id, actor_id, action, entity_type, entity_id) VALUES ($1,$2,$3,$4,$5)',
      [org_id, req.user.id, 'payroll_created', 'payroll_schedule', rows[0].id]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.list = async (req, res) => {
  const { treasury_id } = req.query;
  const { rows } = await db.query('SELECT * FROM payroll_schedules WHERE org_id=$1 ORDER BY next_run_at', [treasury_id]);
  res.json(rows);
};

exports.history = async (req, res) => {
  const { treasury_id } = req.query;
  const { rows } = await db.query(
    'SELECT pr.*, ps.employee_name, ps.employee_address FROM payroll_runs pr JOIN payroll_schedules ps ON ps.id=pr.schedule_id WHERE pr.org_id=$1 ORDER BY pr.ran_at DESC LIMIT 50',
    [treasury_id]
  );
  res.json(rows);
};

exports.remove = async (req, res) => {
  const { rows } = await db.query("UPDATE payroll_schedules SET active=FALSE WHERE id=$1 AND org_id=$2 RETURNING id", [req.params.id, req.orgId]);
  if (!rows.length) return res.status(404).json({ error: 'Schedule not found' });
  res.json({ message: 'Payroll schedule cancelled' });
};
