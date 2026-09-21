const { body } = require('express-validator');

const createUserValidators = [
  body('name').isString().withMessage('Name is required.').bail().trim().notEmpty().withMessage('Name is required.'),
  body('email').isString().withMessage('A valid email address is required.').bail().trim().isEmail().withMessage('A valid email address is required.'),
  body('password').isString().withMessage('Password must be at least 6 characters.').bail().isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
  body('role').isIn(['ADMIN', 'TEAM_MEMBER']).withMessage('Role must be ADMIN or TEAM_MEMBER.'),
];

const updateUserValidators = [
  body('name').optional().isString().withMessage('Name cannot be empty.').bail().trim().notEmpty().withMessage('Name cannot be empty.'),
  body('role').optional().isIn(['ADMIN', 'TEAM_MEMBER']).withMessage('Role must be ADMIN or TEAM_MEMBER.'),
  body('password').optional().isString().withMessage('Password must be at least 6 characters.').bail().isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
];

module.exports = { createUserValidators, updateUserValidators };
