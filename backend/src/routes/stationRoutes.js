const router = require('express').Router();
const stations = require('../controllers/stationController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.use(authenticate);

router.get('/', stations.list);
router.get('/:id', stations.getOne);
router.post('/:id/plug-in', stations.plugIn);

router.post('/', requireAdmin, stations.create);
router.put('/:id', requireAdmin, stations.update);
router.patch('/:id/status', requireAdmin, stations.setStatus);
router.delete('/:id', requireAdmin, stations.remove);

module.exports = router;
