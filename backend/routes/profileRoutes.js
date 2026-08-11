const express = require('express');
const ctrl = require('../controllers/profileController');
const { requireAuth } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { changePasswordValidators } = require('../validators/profileValidators');

const router = express.Router();
router.use(requireAuth);
router.get('/', ctrl.getProfile);
router.put('/', ctrl.updateProfile);
router.put('/password', changePasswordValidators, validate, ctrl.changePassword);
module.exports = router;
