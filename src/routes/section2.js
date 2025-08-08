const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { extractSection2Pdf } = require('../controllers/section2Controller');

// Configure multer with more specific settings
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Use absolute path to ensure temp directory is found
    const tempDir = path.join(__dirname, '../../temp');
    // Ensure temp directory exists
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'section2-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    console.log('File filter - mimetype:', file.mimetype);
    console.log('File filter - originalname:', file.originalname);
    // Only allow PDF files
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// Add error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error('Multer error:', err);
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        success: false, 
        error: 'File too large. Maximum size is 10MB.' 
      });
    }
    return res.status(400).json({ 
      success: false, 
      error: 'File upload error: ' + err.message 
    });
  } else if (err) {
    console.error('Upload error:', err);
    return res.status(400).json({ 
      success: false, 
      error: err.message 
    });
  }
  next();
};

// Middleware to log upload details
const logUploadDetails = (req, res, next) => {
  console.log('=== UPLOAD DETAILS ===');
  console.log('File object:', req.file);
  if (req.file) {
    console.log('File path:', req.file.path);
    console.log('File exists:', fs.existsSync(req.file.path));
    console.log('File size:', req.file.size);
    console.log('File mimetype:', req.file.mimetype);
  }
  console.log('=== END UPLOAD DETAILS ===');
  next();
};

// PDF extraction endpoint
router.post('/extract-section2-pdf', 
  upload.single('pdf'), 
  handleMulterError,
  logUploadDetails,
  extractSection2Pdf
);

module.exports = router;