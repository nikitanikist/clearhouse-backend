// // src/server.js
// const express = require('express');
// const cors = require('cors');
// const helmet = require('helmet');
// const compression = require('compression');
// const rateLimit = require('express-rate-limit');
// const path = require('path');
// const fs = require('fs');
// require('dotenv').config();

// // Import custom modules
// const { connectDB } = require('./config/database');
// const logger = require('./utils/logger');
// const errorHandler = require('./middleware/errorHandler');

// // Import routes
// const authRoutes = require('./routes/auth');
// const userRoutes = require('./routes/users');
// const clientRoutes = require('./routes/clients');
// const formRoutes = require('./routes/forms');
// const fileRoutes = require('./routes/files');
// const extractRoutes = require('./routes/extract');

// // Create Express app
// const app = express();

// // Trust proxy
// app.set('trust proxy', 1);

// // Security middleware
// app.use(helmet({
//   crossOriginResourcePolicy: { policy: "cross-origin" }
// }));

// // CORS configuration
// const allowedOrigins = [
//   process.env.FRONTEND_URL || 'http://localhost:8080',
//   'http://localhost:5173', // Vite default
//   'http://localhost:8080', // Your current frontend
//   'http://localhost:3000'  // Common React port
// ];

// app.use(cors({
//   origin: function (origin, callback) {
//     // Allow requests with no origin (like mobile apps or curl requests)
//     if (!origin) return callback(null, true);
    
//     if (allowedOrigins.indexOf(origin) !== -1) {
//       callback(null, true);
//     } else {
//       callback(new Error('Not allowed by CORS'));
//     }
//   },
//   credentials: true,
//   optionsSuccessStatus: 200
// }));

// // Rate limiting
// const limiter = rateLimit({
//   windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) * 60 * 1000, // 15 minutes
//   max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
//   message: 'Too many requests from this IP, please try again later.'
// });
// app.use('/api/', limiter);

// // Body parsing middleware
// app.use(express.json({ limit: '10mb' }));
// app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// // Compression middleware
// app.use(compression());

// // Request logging
// app.use((req, res, next) => {
//   logger.info(`${req.method} ${req.url}`, {
//     ip: req.ip,
//     userAgent: req.get('user-agent')
//   });
//   next();
// });

// // Create upload directory if it doesn't exist
// const uploadPath = process.env.UPLOAD_PATH || './storage/uploads';
// if (!fs.existsSync(uploadPath)) {
//   fs.mkdirSync(uploadPath, { recursive: true });
//   logger.info(`Created upload directory: ${uploadPath}`);
// }

// // Static file serving for uploads (with authentication)
// app.use('/uploads', express.static(path.join(__dirname, '../storage/uploads')));

// // API Routes
// app.use('/api/auth', authRoutes);
// app.use('/api/users', userRoutes);
// app.use('/api/clients', clientRoutes);
// app.use('/api/forms', formRoutes);
// app.use('/api/files', fileRoutes);
// app.use('/api/extract-pdf', extractRoutes);

// // Health check endpoint
// app.get('/api/health', (req, res) => {
//   res.json({
//     status: 'OK',
//     timestamp: new Date().toISOString(),
//     environment: process.env.NODE_ENV,
//     version: process.env.npm_package_version
//   });
// });

// // 404 handler
// app.use((req, res) => {
//   res.status(404).json({
//     error: 'Route not found',
//     code: 'ROUTE_NOT_FOUND'
//   });
// });

// // Global error handler
// app.use(errorHandler);

// // Start server
// const PORT = process.env.PORT || 5000;

// const startServer = async () => {
//   try {
//     // Connect to database
//     await connectDB();
    
//     // Start listening
//     app.listen(PORT, () => {
//       logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
//       logger.info(`Frontend URL: ${process.env.FRONTEND_URL}`);
//       logger.info(`API Health Check: http://localhost:${PORT}/api/health`);
//     });
//   } catch (error) {
//     logger.error('Failed to start server:', error);
//     process.exit(1);
//   }
// };

// // Handle unhandled promise rejections
// process.on('unhandledRejection', (err) => {
//   logger.error('Unhandled Promise Rejection:', err);
//   // Close server & exit process
//   process.exit(1);
// });

// // Handle uncaught exceptions
// process.on('uncaughtException', (err) => {
//   logger.error('Uncaught Exception:', err);
//   // Close server & exit process
//   process.exit(1);
// });

// // Graceful shutdown
// process.on('SIGTERM', () => {
//   logger.info('SIGTERM signal received: closing HTTP server');
//   app.close(() => {
//     logger.info('HTTP server closed');
//     process.exit(0);
//   });
// });

// // Start the server
// startServer();


// src/server.js

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Import custom modules
const { connectDB, query } = require('./config/database');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');
const { authenticate } = require('./middleware/auth');

// Import routes
const authRoutes = require('./routes/auth');
const extractRoutes = require('./routes/extract');
const userRoutes = require('./routes/users');
const clientRoutes = require('./routes/clients');
const formRoutes = require('./routes/forms');
const fileRoutes = require('./routes/files');
const section2Routes = require('./routes/section2');

// Initialize express app
const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:8083',
    'http://localhost:8083'  // Match actual frontend port
  ],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api', extractRoutes);  // This will handle /api/extract-pdf
app.use('/api/users', userRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/files', fileRoutes);
app.use('/api', section2Routes);

// Admin routes
app.get('/api/admins', authenticate, async (req, res) => {
  try {
    const result = await query(
      'SELECT id, name, email, role FROM users WHERE role = $1 AND is_active = $2 ORDER BY name',
      ['admin', true]
    );
    res.json({ admins: result.rows });
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({ error: 'Failed to fetch admins' });
  }
});

// Static files for uploads (if needed)
app.use('/uploads', express.static(path.join(__dirname, '../storage/uploads')));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    status: 'error', 
    message: 'Route not found' 
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Create upload directory if it doesn't exist
const uploadPath = process.env.UPLOAD_PATH || './storage/uploads';
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
  logger.info(`Created upload directory: ${uploadPath}`);
}

// Start server - Use environment variable
const PORT = process.env.PORT || 5005;

const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Start listening
    const server = app.listen(PORT, () => {
      console.log('='.repeat(50));
      console.log(`🚀 BACKEND SERVER STARTED`);
      console.log(`🌐 Port: ${PORT}`);
      console.log(`📍 URL: http://localhost:${PORT}`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`🖥️  Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:8083'}`);
      console.log(`📂 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log('='.repeat(50));
      
      logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
      logger.info(`API Health Check: http://localhost:${PORT}/api/health`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

    process.on('unhandledRejection', (err) => {
      logger.error('Unhandled Promise Rejection:', err);
      server.close(() => {
        process.exit(1);
      });
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = app;