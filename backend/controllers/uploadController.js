const r2Service = require('../services/r2Service');
const logger = require('../utils/logger');

async function uploadFile(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    // Process and upload the file buffer
    const publicUrl = await r2Service.uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype);

    // If local uploads are used in development, replace localhost with the public tunnel URL (if accessed via tunnel)
    let finalUrl = publicUrl;
    if (publicUrl.includes('/uploads/')) {
      const requestHost = req.get('host');
      if (requestHost && !requestHost.startsWith('localhost') && !requestHost.startsWith('127.0.0.1')) {
        const protocol = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
        // Replace protocol and host
        finalUrl = publicUrl.replace(/^http:\/\/localhost:\d+/, `${protocol}://${requestHost}`);
      }
    }

    res.json({
      message: 'File uploaded and optimized successfully.',
      url: finalUrl,
    });
  } catch (err) {
    logger.error({ err }, '[uploadController] Upload handler failed');
    next(err);
  }
}

module.exports = {
  uploadFile,
};
