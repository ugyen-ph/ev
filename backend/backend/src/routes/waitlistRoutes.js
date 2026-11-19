const router = require('express').Router();
const waitlist = require('../controllers/waitlistController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate);

router.get('/mine', waitlist.mine);                         // must stay above '/:id'
router.post('/', waitlist.join);
router.delete('/station/:stationId', waitlist.leave);

router.get('/', requireAdmin, waitlist.listAll);
router.delete('/:id', requireAdmin, waitlist.adminRemove);

module.exports = router;
