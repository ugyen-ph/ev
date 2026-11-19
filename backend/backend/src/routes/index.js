const router = require('express').Router();

router.get('/health', (req, res) => res.json({ status: 'ok', time: Date.now() }));

router.use('/auth', require('./authRoutes'));
router.use('/users', require('./userRoutes'));
router.use('/stations', require('./stationRoutes'));
router.use('/waitlist', require('./waitlistRoutes'));
router.use('/reports', require('./reportRoutes'));
router.use('/sessions', require('./sessionRoutes'));
router.use('/notifications', require('./notificationRoutes'));
router.use('/ocpp-logs', require('./ocppLogRoutes'));

module.exports = router;
