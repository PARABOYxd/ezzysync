const express = require('express');
const ctrl = require('../controllers/followUpController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(requireAuth);

router.get('/', ctrl.list);
router.patch('/:id/done', ctrl.markDone);

module.exports = router;
