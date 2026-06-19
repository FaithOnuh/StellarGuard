const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/memberController');
const { auth, orgMember, orgAdmin } = require('../middleware/auth');

router.post('/', auth, [
  body('org_id').notEmpty(),
  body('user_email').isEmail(),
  body('signing_weight').optional().isInt({ min: 1 }),
], async (req, res, next) => { req.params.orgId = req.body.org_id; next(); }, orgAdmin, ctrl.add);

router.get('/', auth, async (req, res, next) => { req.params.orgId = req.query.org_id; next(); }, orgMember, ctrl.list);
router.delete('/:id', auth, async (req, res, next) => { req.params.orgId = req.query.org_id; next(); }, orgAdmin, ctrl.remove);

module.exports = router;
