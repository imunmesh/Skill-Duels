const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware: Verify Bearer JWT token and attach user to req.user (NFR-03)
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Missing or malformed Bearer token.',
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    const jwtSecret = process.env.JWT_SECRET || 'super_secret_jwt_key_change_in_production_min_32_chars';

    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token has expired. Please log in again.',
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid or malformed authentication token.',
      });
    }

    // Retrieve active user from database to ensure user still exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User belonging to this token no longer exists.',
      });
    }

    // Attach user document to request object for downstream controllers
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware: Authorize specific roles (e.g. 'player', 'admin') (NFR-03)
 * @param  {...string} allowedRoles
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Authentication required before role verification.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access requires one of the following roles: [${allowedRoles.join(
          ', '
        )}]. Current role: '${req.user.role}'.`,
      });
    }

    next();
  };
};

/**
 * Socket.IO Handshake Auth Helper for Student 2 (Match Engine integration)
 * Can be used as: io.use(authenticateSocket);
 */
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication error: Token missing from socket handshake'));
    }

    const jwtSecret = process.env.JWT_SECRET || 'super_secret_jwt_key_change_in_production_min_32_chars';
    const decoded = jwt.verify(token, jwtSecret);

    // Strictly authenticate against live MongoDB User model (NFR-03)
    const user = await User.findById(decoded.id);
    if (!user) {
      return next(new Error('Authentication error: User not found in database'));
    }

    socket.user = user;
    next();
  } catch (error) {
    next(new Error(`Authentication error: ${error.message}`));
  }
};

module.exports = {
  authenticateToken,
  authenticateJWT: authenticateToken,
  requireRole,
  authenticateSocket,
};
