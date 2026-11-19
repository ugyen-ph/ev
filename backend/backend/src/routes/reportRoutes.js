const router = require('express').Router();
const reports = require('../controllers/reportController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate);

router.get('/mine', reports.mine);                          // must stay above '/:id'
router.post('/', reports.create);

router.get('/', requireAdmin, reports.listAll);
router.patch('/:id/status', requireAdmin, reports.setStatus);

module.exports = router;
