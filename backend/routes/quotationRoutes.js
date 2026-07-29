const express = require('express');
const ctrl = require('../controllers/quotationController');
const { requireAuth } = require('../middleware/authMiddleware');
const { publicLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Public routes for clients (No login required)
router.get('/public/:uuid', publicLimiter, ctrl.getPublic);
router.post('/:id/accept-public', publicLimiter, ctrl.accept);

// Authenticated CRM team routes
router.use(requireAuth);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.deleteQuote);
router.post('/:id/accept', ctrl.accept);

module.exports = router;
