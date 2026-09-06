const { body } = require('express-validator');

const changePasswordValidators = [
  body('currentPassword').notEmpty().withMessage('Enter your current password.'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters.'),
];

module.exports = { changePasswordValidators };
