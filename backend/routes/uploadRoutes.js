const express = require('express');
const multer = require('multer');
const controller = require('../controllers/uploadController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow images and PDFs
    if (!file.mimetype.startsWith('image/') && file.mimetype !== 'application/pdf') {
      return cb(new Error('Only image and PDF files are allowed!'), false);
    }
    cb(null, true);
  },
});

// Protect upload endpoint with auth so only logged-in agency users can upload
router.post('/', requireAuth, upload.single('file'), (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File is too large. Maximum allowed size is 5MB.' });
    }
    return res.status(400).json({ message: err.message });
  } else if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
}, controller.uploadFile);

module.exports = router;
