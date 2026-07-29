const express = require('express');
const ctrl = require('../controllers/dashboardController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();
router.get('/', requireAuth, (req, res, next) => {
  if (req.user.role === 'TEAM_MEMBER') {
    return res.status(403).json({ message: 'Access denied. Team members do not have access to analytics.' });
  }
  next();
}, ctrl.getDashboard);
module.exports = router;
