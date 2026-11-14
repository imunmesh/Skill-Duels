const express = require('express');
const multer = require('multer');
const { authenticateJWT } = require('../middleware/auth.middleware');
const {
  getSkills,
  getMyProfile,
  updateProfile,
  uploadAvatar,
} = require('../controllers/profile.controller');

const router = express.Router();

// Configure Multer (In-memory storage for binary magic-byte validation)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2 Megabytes
  },
  fileFilter: (req, file, cb) => {
    // Preliminary extension & MIME check (magic bytes checked on buffer in controller)
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, and WebP images are permitted.'));
    }
  },
});

// Middleware to handle multer file size limit errors gracefully
const handleUpload = (req, res, next) => {
  upload.single('avatar')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum avatar size is 2 MB.',
        });
      }
      return res.status(400).json({ success: false, message: err.message });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};

// Public Skills Catalog Endpoint
router.get('/skills', getSkills);

// Authenticated Profile Endpoints
router.get('/profile/me', authenticateJWT, getMyProfile);
router.put('/profile', authenticateJWT, updateProfile);
router.post('/profile/avatar', authenticateJWT, handleUpload, uploadAvatar);

module.exports = router;
