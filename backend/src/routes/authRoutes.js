const router = require('express').Router();
const auth = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');

router.post('/register', authLimiter, auth.register);
router.post('/login', authLimiter, auth.login);
router.post('/forgot-password', authLimiter, auth.forgotPassword);
router.post('/reset-password', authLimiter, auth.resetPassword);
router.get('/verify-email', auth.verifyEmail);
router.post('/verify-code', authLimiter, auth.verifyCode);
router.post('/resend-code', authLimiter, auth.resendCode);
router.post('/resend-verification', authLimiter, auth.resendVerification);
router.get('/me', authenticate, auth.me);
router.post('/logout', authenticate, auth.logout);

module.exports = router;
