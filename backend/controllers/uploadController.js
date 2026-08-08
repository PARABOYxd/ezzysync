const r2Service = require('../services/r2Service');
const logger = require('../utils/logger');

async function uploadFile(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    // Process and upload the image buffer
    const publicUrl = await r2Service.uploadImage(req.file.buffer, req.file.originalname);

    res.json({
      message: 'File uploaded and optimized successfully.',
      url: publicUrl,
    });
  } catch (err) {
    logger.error({ err }, '[uploadController] Upload handler failed');
    next(err);
  }
}

module.exports = {
  uploadFile,
};
