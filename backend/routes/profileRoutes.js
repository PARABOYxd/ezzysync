const express = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/profileController');
const { requireAuth } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');

const router = express.Router();
router.use(requireAuth);
router.get('/', ctrl.getProfile);
router.put('/', ctrl.updateProfile);
router.put(
  '/password',
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters.'),
  ],
  validate,
  ctrl.changePassword
);
module.exports = router;
