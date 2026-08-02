const express = require('express');
const ctrl = require('../controllers/followUpController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(requireAuth);

router.get('/', ctrl.list);
router.get('/completed', ctrl.listCompleted);
router.patch('/:id/done', ctrl.markDone);

module.exports = router;
