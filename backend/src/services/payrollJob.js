const cron = require('node-cron');
const db     = require('../db');
const stellar = require('./stellar');

// Runs every hour — processes due payroll schedules
cron.schedule('0 * * * *', async () => {
  console.log('[Payroll] Running scheduled payroll check…');
  try {
    const { rows: due } = await db.query(
      `SELECT ps.*, o.treasury_secret_enc
       FROM payroll_schedules ps
       JOIN organisations o ON o.id = ps.org_id
       WHERE ps.active = TRUE AND ps.next_run_at <= NOW()`
    );

    for (const schedule of due) {
      try {
        const secret = stellar.decrypt(schedule.treasury_secret_enc);
        const hash   = await stellar.sendPayment({
          fromSecret: secret,
          toAddress:  schedule.employee_address,
          amount:     schedule.amount,
          asset:      schedule.asset,
          memo:       'StellarGuard Payroll',
        });

        // Record run
        await db.query(
          'INSERT INTO payroll_runs (schedule_id, org_id, amount, asset, stellar_hash, status) VALUES ($1,$2,$3,$4,$5,$6)',
          [schedule.id, schedule.org_id, schedule.amount, schedule.asset, hash, 'success']
        );

        // Advance next_run_at
        const interval = schedule.frequency === 'weekly' ? '7 days'
          : schedule.frequency === 'biweekly' ? '14 days' : '1 month';
        await db.query(
          `UPDATE payroll_schedules SET next_run_at = next_run_at + INTERVAL '${interval}' WHERE id = $1`,
          [schedule.id]
        );

        console.log(`[Payroll] Paid ${schedule.amount} ${schedule.asset} → ${schedule.employee_address} (${hash})`);
      } catch (err) {
        console.error(`[Payroll] Failed for schedule ${schedule.id}:`, err.message);
        await db.query(
          'INSERT INTO payroll_runs (schedule_id, org_id, amount, asset, status) VALUES ($1,$2,$3,$4,$5)',
          [schedule.id, schedule.org_id, schedule.amount, schedule.asset, 'failed']
        );
      }
    }
  } catch (err) {
    console.error('[Payroll] Cron error:', err.message);
  }
});
