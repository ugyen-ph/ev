const router = require('express').Router();
const logs = require('../controllers/ocppLogController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate, requireAdmin);

router.get('/', logs.list);
router.post('/', logs.create);
router.delete('/', logs.clear);

module.exports = router;
