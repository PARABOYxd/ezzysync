const instagramDirectService = require('../services/instagramDirectService');

async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Instagram username and password are required.' });
    }

    const result = await instagramDirectService.loginWithCredentials(req.user.tenantId, username, password);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to login to Instagram.' });
  }
}

async function verifyCode(req, res, next) {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ message: 'Verification code is required.' });
    }

    const result = await instagramDirectService.submitVerificationCode(req.user.tenantId, code);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to verify security code.' });
  }
}

async function getStatus(req, res, next) {
  try {
    const status = await instagramDirectService.getStatus(req.user.tenantId);
    res.json(status);
  } catch (err) {
    next(err);
  }
}

async function disconnect(req, res, next) {
  try {
    const result = await instagramDirectService.disconnectSession(req.user.tenantId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  verifyCode,
  getStatus,
  disconnect,
};
