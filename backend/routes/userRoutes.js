const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const ctrl = require('../controllers/userController');

const router = express.Router();
router.use(requireAuth);

// Gating all user management endpoints strictly for ADMINs
router.use((req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Access denied. Administrator privileges required.' });
  }
  next();
});

const userCreateValidators = [
  body('name').trim().notEmpty().withMessage('Name is required.'),
  body('email').trim().isEmail().withMessage('A valid email address is required.'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
  body('role').isIn(['ADMIN', 'TEAM_MEMBER']).withMessage('Role must be ADMIN or TEAM_MEMBER.'),
];

const userUpdateValidators = [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty.'),
  body('role').optional().isIn(['ADMIN', 'TEAM_MEMBER']).withMessage('Role must be ADMIN or TEAM_MEMBER.'),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
];

router.get('/', ctrl.list);
router.post('/', userCreateValidators, validate, ctrl.create);
router.put('/:id', userUpdateValidators, validate, ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
