const express = require('express');
const cors = require('cors');
const path = require('path');
const authRoutes = require('./routes/auth.routes');
const testRoutes = require('./routes/test.routes');
const categoryRoutes = require('./routes/category.routes');
const questionRoutes = require('./routes/question.routes');
const leaderboardRoutes = require('./routes/leaderboard.routes');
const profileRoutes = require('./routes/profile.routes');
const { notFound, errorHandler } = require('./middleware/error.middleware');

const app = express();

// Enable Cross-Origin Resource Sharing (configurable for frontend client)
const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(
  cors({
    origin: allowedOrigin,
    credentials: true,
  })
);

// Body Parsing Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve Uploaded Files Statically (e.g. /uploads/avatars/...)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Server Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'UP',
    timestamp: new Date().toISOString(),
    service: 'SkillDuels Backend API',
  });
});

// Mount Feature API Routes
app.use('/api/auth', authRoutes);
app.use('/api/test', testRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api', profileRoutes);

// Fallback 404 handler for unknown routes
app.use(notFound);

// Centralized error handler
app.use(errorHandler);

module.exports = app;
