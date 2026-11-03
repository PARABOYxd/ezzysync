const express = require('express');
const ctrl = require('../controllers/metaLeadController');
const { requireAuth } = require('../middleware/authMiddleware');
const { requireAdmin } = require('../middleware/permissionMiddleware');

const router = express.Router();

// The Facebook login popup. Neither carries the usual header: the first is a
// browser navigation (the JWT is passed in the query), the second is Facebook
// redirecting back, trusted through the signed `state`.
router.get('/auth', ctrl.startOAuth);
router.get('/callback', ctrl.handleCallback);

router.use(requireAuth, requireAdmin);
router.get('/', ctrl.overview);
router.post('/pages/:id/connect', ctrl.connect);
router.post('/pages/:id/disconnect', ctrl.disconnect);
router.patch('/pages/:id/paused', ctrl.setPaused);
router.delete('/pages/:id', ctrl.remove);

module.exports = router;
