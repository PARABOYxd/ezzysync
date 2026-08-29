const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validate');
const { requireUsageLimit } = require('../middleware/planMiddleware');
const ctrl = require('../controllers/userController');
const { createUserValidators, updateUserValidators } = require('../validators/userValidators');

const router = express.Router();
router.use(requireAuth);

// Gating all user management endpoints strictly for ADMINs
router.use((req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Access denied. Administrator privileges required.' });
  }
  next();
});

router.get('/', ctrl.list);
router.post('/', requireUsageLimit('teamMembers'), createUserValidators, validate, ctrl.create);
router.put('/:id', updateUserValidators, validate, ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
