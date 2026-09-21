const { body } = require('express-validator');

const changePasswordValidators = [
  body('currentPassword').isString().withMessage('Enter your current password.').bail().notEmpty().withMessage('Enter your current password.'),
  body('newPassword').isString().withMessage('New password must be at least 6 characters.').bail().isLength({ min: 6 }).withMessage('New password must be at least 6 characters.'),
];

module.exports = { changePasswordValidators };
