// /* module.exports = require('express').Router(); */

// // src/routes/extract.js
// const express = require('express');
// const router = express.Router();
// const multer = require('multer');
// const { authenticate } = require('../middleware/auth');
// const { extractPDF, extractPDFFiles } = require('../controllers/extractController');

// // Configure multer for file uploads
// const storage = multer.memoryStorage();
// const upload = multer({
//   storage: storage,
//   limits: {
//     fileSize: 10 * 1024 * 1024, // 10MB limit
//     files: 10 // Maximum 10 files
//   },
//   fileFilter: (req, file, cb) => {
//     // Only accept PDF files
//     if (file.mimetype === 'application/pdf') {
//       cb(null, true);
//     } else {
//       cb(new Error('Only PDF files are allowed'));
//     }
//   }
// });

// // POST /api/extract-pdf - Extract data from base64 PDFs
// router.post('/', authenticate, extractPDF);

// // POST /api/extract-pdf/upload - Extract data from uploaded PDF files
// // router.post('/upload', authenticate, upload.array('files', 10), extractPDFFiles);

// router.post('/upload', authenticate, upload.array('files', 10), extractPDFFiles);

// module.exports = router;

// src/routes/extract.js

const express = require('express');
const router = express.Router();
const { extractPDF, uploadMiddleware } = require('../controllers/extractController');
const { authenticate } = require('../middleware/auth');

// POST /api/extract-pdf - Extract data from uploaded PDF
router.post('/extract-pdf', authenticate, uploadMiddleware, extractPDF);

module.exports = router;