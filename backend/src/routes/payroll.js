const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/payrollController');
const { auth, orgMember, orgAdmin } = require('../middleware/auth');

router.post('/', auth, [
  body('org_id').notEmpty(),
  body('employee_name').notEmpty(),
  body('employee_address').notEmpty(),
  body('amount').isFloat({ gt: 0 }),
  body('next_run_at').isISO8601(),
], async (req, res, next) => { req.params.orgId = req.body.org_id; next(); }, orgAdmin, ctrl.create);

router.get('/', auth, async (req, res, next) => { req.params.orgId = req.query.treasury_id; next(); }, orgMember, ctrl.list);
router.get('/history', auth, async (req, res, next) => { req.params.orgId = req.query.treasury_id; next(); }, orgMember, ctrl.history);
router.delete('/:id', auth, async (req, res, next) => { req.params.orgId = req.query.org_id; next(); }, orgAdmin, ctrl.remove);

module.exports = router;
