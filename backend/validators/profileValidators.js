const { body } = require('express-validator');

const changePasswordValidators = [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters.'),
];

module.exports = { changePasswordValidators };
