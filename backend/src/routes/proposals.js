const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/proposalController');
const { auth, orgMember } = require('../middleware/auth');

// list & create — orgMember derived from body/query
router.post('/', auth, [
  body('org_id').notEmpty(),
  body('title').notEmpty(),
  body('to_address').notEmpty(),
  body('amount').isFloat({ gt: 0 }),
], async (req, res, next) => {
  req.params.orgId = req.body.org_id;
  next();
}, orgMember, ctrl.create);

router.get('/', auth, async (req, res, next) => {
  req.params.orgId = req.query.treasury_id;
  next();
}, orgMember, ctrl.list);

router.post('/:id/vote', auth, async (req, res, next) => {
  // orgId resolved inside controller via proposal lookup
  next();
}, ctrl.vote);

module.exports = router;
