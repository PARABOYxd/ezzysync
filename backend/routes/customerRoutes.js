const express = require('express');
const ctrl = require('../controllers/customerController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(requireAuth);

router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);

module.exports = router;
