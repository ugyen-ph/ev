const router = require('express').Router();
const sessions = require('../controllers/sessionController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', sessions.list);
router.post('/', sessions.start);
router.post('/:id/stop', sessions.stop);

module.exports = router;
