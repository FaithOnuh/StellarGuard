const router = require('express').Router();
const ctrl = require('../controllers/adminController');
const { auth } = require('../middleware/auth');

router.get('/health', auth, ctrl.health);
router.get('/audit',  auth, ctrl.auditLog);

module.exports = router;
