const router = require('express').Router();
const users = require('../controllers/userController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate);

router.patch('/me', users.updateMe);                    // must stay above '/:id'

router.get('/stats', requireAdmin, users.stats);
router.get('/', requireAdmin, users.list);
router.patch('/:id', requireAdmin, users.adminUpdate);
router.delete('/:id', requireAdmin, users.remove);

module.exports = router;
