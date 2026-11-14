const http = require('http');
const dotenv = require('dotenv');

// Load environment variables before any module loads
dotenv.config();

const app = require('./app');
const connectDB = require('./config/db');
const initSocketServer = require('./socket');

// Create standard Node HTTP server wrapping Express app
const server = http.createServer(app);

// Initialize Socket.IO real-time match engine (Student 2 - FR-03, FR-04, FR-05)
const io = initSocketServer(server);

const PORT = process.env.PORT || 5000;

// Connect to MongoDB and start HTTP listener
const startServer = async () => {
  await connectDB();

  server.listen(PORT, () => {
    console.log('===============================================');
    console.log(` SkillDuels Backend API Server running on port ${PORT}`);
    console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(` Health Check: http://localhost:${PORT}/api/health`);
    console.log('===============================================');
  });
};

// Graceful shutdown handling (NFR-04)
const gracefulShutdown = (signal) => {
  console.log(`\n[Server] Received ${signal}. Closing HTTP server gracefully...`);
  server.close(() => {
    console.log('[Server] HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

startServer();

module.exports = { app, server, io };
