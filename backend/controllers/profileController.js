const bcrypt = require('bcryptjs');
const userService = require('../services/userService');

async function getProfile(req, res, next) {
  try {
    const user = await userService.findUserById(req.user.userId || req.user.tenantId);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json({ profile: { email: user.email, name: user.name, companyName: user.companyName } });
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const { name, companyName } = req.body;
    const user = await userService.updateProfile(req.user.userId || req.user.tenantId, req.user.tenantId, { name, companyName });
    res.json({ profile: { email: user.email, name: user.name, companyName: user.companyName } });
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await userService.findUserById(req.user.userId || req.user.tenantId);
    const valid = await userService.verifyPassword(user, currentPassword);
    if (!valid) return res.status(401).json({ message: 'Current password is incorrect.' });

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await userService.updateProfile(req.user.userId || req.user.tenantId, req.user.tenantId, { newPasswordHash });
    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getProfile, updateProfile, changePassword };
