const router   = require('express').Router();
const rateLimit = require('express-rate-limit');
const { body } = require('express-validator');
const ctrl     = require('../controllers/authController');
const { auth } = require('../middleware/auth');

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 });

router.post('/register', limiter, [body('email').isEmail(), body('password').isLength({ min: 8 }), body('full_name').notEmpty()], ctrl.register);
router.post('/login',    limiter, [body('email').isEmail(), body('password').notEmpty()], ctrl.login);
router.get('/me', auth, ctrl.me);

module.exports = router;
