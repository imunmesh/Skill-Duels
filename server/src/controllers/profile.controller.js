const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const { SKILLS_CATALOG, ALL_SKILLS } = require('../constants/skills');
const { getDisplayStreak } = require('../services/streak');

/**
 * Validate actual binary content type via magic bytes
 * Ensures real jpg, png, or webp format regardless of extension
 */
const detectImageMimeType = (buffer) => {
  if (!buffer || buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  // WebP: RIFF (bytes 0-3) + WEBP (bytes 8-11)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp';
  }

  return null;
};

/**
 * @desc    Get skill catalog with categories and flat suggestions
 * @route   GET /api/skills
 * @access  Public
 */
const getSkills = (req, res) => {
  return res.status(200).json({
    success: true,
    skillsCatalog: SKILLS_CATALOG,
    allSkills: ALL_SKILLS,
  });
};

/**
 * @desc    Get authenticated user's profile
 * @route   GET /api/profile/me
 * @access  Private
 */
const getMyProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const userObj = user.toObject();
    if (userObj.streak) {
      const display = getDisplayStreak(userObj.streak);
      userObj.streak = {
        current: display.current,
        longest: userObj.streak.longest ?? userObj.streak.highest ?? 0,
        highest: userObj.streak.longest ?? userObj.streak.highest ?? 0,
        atRisk: display.atRisk,
        hoursRemaining: display.hoursRemaining,
        lastPlayedDay: userObj.streak.lastPlayedDay || null,
      };
    }
    return res.status(200).json({ success: true, user: userObj });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update editable profile fields (displayName, bio, skills, avatarUrl)
 * @route   PUT /api/profile
 * @access  Private
 */
const updateProfile = async (req, res, next) => {
  try {
    const { displayName, bio, skills, avatarUrl } = req.body;

    // Security: Only owner can modify their profile
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Validation: Display name
    if (displayName !== undefined) {
      if (typeof displayName !== 'string' || displayName.length > 50) {
        return res.status(400).json({
          success: false,
          message: 'Display name must not exceed 50 characters.',
        });
      }
      user.displayName = displayName.trim();
    }

    // Validation: Bio (max 300 characters)
    if (bio !== undefined) {
      if (typeof bio !== 'string' || bio.length > 300) {
        return res.status(400).json({
          success: false,
          message: 'Bio cannot exceed 300 characters.',
        });
      }
      user.bio = bio.trim();
    }

    // Validation: Skills (max 10 items, strings)
    if (skills !== undefined) {
      if (!Array.isArray(skills)) {
        return res.status(400).json({
          success: false,
          message: 'Skills must be an array of strings.',
        });
      }
      if (skills.length > 10) {
        return res.status(400).json({
          success: false,
          message: 'You can add up to 10 skills maximum.',
        });
      }

      // Sanitize and trim each skill
      const cleanedSkills = skills
        .map((s) => (typeof s === 'string' ? s.trim() : ''))
        .filter((s) => s.length > 0 && s.length <= 40);

      // Remove duplicates while preserving order
      user.skills = [...new Set(cleanedSkills)];
    }

    // Avatar URL whitelist
    if (avatarUrl !== undefined && typeof avatarUrl === 'string') {
      user.avatarUrl = avatarUrl.trim();
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Upload profile picture (max 2MB, validates real jpg/png/webp bytes)
 * @route   POST /api/profile/avatar
 * @access  Private
 */
const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file uploaded. Please select an image.',
      });
    }

    // Verify binary magic bytes
    const detectedMime = detectImageMimeType(req.file.buffer);
    if (!detectedMime) {
      return res.status(400).json({
        success: false,
        message: 'Invalid image content. Only actual JPG, PNG, and WebP files are accepted.',
      });
    }

    // Determine extension from detected MIME
    let extension = 'jpg';
    if (detectedMime === 'image/png') extension = 'png';
    else if (detectedMime === 'image/webp') extension = 'webp';

    // Ensure uploads directory exists
    const uploadsDir = path.join(__dirname, '../../uploads/avatars');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filename = `avatar_${req.user.id}_${Date.now()}.${extension}`;
    const filePath = path.join(uploadsDir, filename);

    // Write file to disk as backup
    fs.writeFileSync(filePath, req.file.buffer);

    // Save as persistent Base64 Data URL so it is stored directly in MongoDB
    // and survives container restarts/deploys on Render ephemeral disks
    const avatarUrl = `data:${detectedMime};base64,${req.file.buffer.toString('base64')}`;

    // Update user document
    const user = await User.findById(req.user.id);
    if (user) {
      user.avatarUrl = avatarUrl;
      await user.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Avatar uploaded successfully.',
      avatarUrl,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSkills,
  getMyProfile,
  updateProfile,
  uploadAvatar,
};
