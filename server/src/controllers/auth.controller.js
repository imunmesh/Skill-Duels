const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Generate a signed JWT token
 * @param {Object} user
 * @returns {string}
 */
const generateToken = (user) => {
  const jwtSecret = process.env.JWT_SECRET || 'super_secret_jwt_key_change_in_production_min_32_chars';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign(
    {
      id: user._id,
      username: user.username,
      role: user.role,
    },
    jwtSecret,
    { expiresIn }
  );
};

/**
 * @desc    Register a new player/user (FR-01)
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    // 1. Basic validation
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username, email, and password.',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.',
      });
    }

    // Role enforcement: Public registration is restricted to 'player' only.
    // The admin account is fixed to admin@skillduels.com.
    const assignedRole = 'player';

    // 2. Check if username or email is already registered
    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase().trim() },
        { username: username.trim() },
      ],
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase().trim()) {
        return res.status(409).json({
          success: false,
          message: 'An account with this email address already exists.',
        });
      }
      return res.status(409).json({
        success: false,
        message: 'This username is already taken. Please choose another.',
      });
    }

    // 3. Hash password with bcrypt
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 4. Create and persist user (User schema defaults handle xp: 0, rank: 'Novice', badges: [])
    const newUser = await User.create({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: assignedRole,
      xp: 0,
      rank: 'Novice',
      badges: [],
    });

    // 5. Generate JWT token
    const token = generateToken(newUser);

    // 6. Return response (passwordHash is automatically stripped by User schema toJSON transform)
    return res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      token,
      user: newUser,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Authenticate user & return token (FR-01)
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1. Validate request payload
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password.',
      });
    }

    // 2. Find user by email and explicitly select passwordHash
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // 3. Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // 4. Generate JWT token
    const token = generateToken(user);

    // 5. Return response
    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get currently authenticated user's profile
 * @route   GET /api/auth/me
 * @access  Private (Bearer JWT required)
 */
const getMe = async (req, res, _next) => {
  // req.user is set by authenticateToken middleware
  return res.status(200).json({
    success: true,
    user: req.user,
  });
};

module.exports = {
  register,
  login,
  getMe,
};
