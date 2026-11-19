const router = require('express').Router();
const notifications = require('../controllers/notificationController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate);

// The logged-in user's own inbox (the bell in the user app). Must stay above the admin-only routes.
router.get('/mine', notifications.mine);
router.post('/mine/read-all', notifications.mineReadAll);

// Everything below is the admin notification feed.
router.use(requireAdmin);

router.get('/', notifications.list);
router.post('/', notifications.create);
router.post('/read-all', notifications.readAll);        // must stay above '/:id'
router.patch('/:id', notifications.setRead);
router.delete('/:id', notifications.remove);

module.exports = router;
