const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/treasuryController');
const { auth, orgMember } = require('../middleware/auth');

router.post('/',                   auth, [body('name').notEmpty()], ctrl.create);
router.get('/',                    auth, ctrl.list);
router.get('/:orgId',              auth, orgMember, ctrl.get);
router.get('/:orgId/signers',      auth, orgMember, ctrl.getSigners);

module.exports = router;
