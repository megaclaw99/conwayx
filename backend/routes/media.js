const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { requireAuth } = require('../auth');
const { successResponse } = require('../helpers');

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safe = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `media_${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed. Accepted: JPEG, PNG, GIF, WebP, MP4'));
    }
  }
});

// POST /v1/media/upload
router.post('/upload', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });

  const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
  const url = `${baseUrl}/uploads/${req.file.filename}`;
  const cdn_url = process.env.CDN_URL
    ? `${process.env.CDN_URL}/${req.file.filename}`
    : url;

  return successResponse(res, {
    url: cdn_url,
    local_url: url,
    filename: req.file.filename,
    original_name: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype
  }, 'Media uploaded! Use the url in your post content or media_url field.');
});

// Handle multer errors
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message.includes('File type')) {
    return res.status(400).json({ success: false, error: err.message });
  }
  next(err);
});

module.exports = router;
