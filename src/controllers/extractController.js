// // // src/controllers/extractController.js
// // const logger = require('../utils/logger');
// // const { extractDataFromPDF, extractDataFromMultiplePDFs } = require('../services/pdfExtractor');

// // // Extract data from base64 PDF
// // const extractPDF = async (req, res) => {
// //   try {
// //     // Handle both 'pdf' and 'pdfData' field names for compatibility
// //     const base64Data = req.body.pdf || req.body.pdfData;
// //     const fileName = req.body.filename || req.body.fileName || 'document.pdf';
    
// //     if (!base64Data) {
// //       return res.status(400).json({
// //         success: false,
// //         error: 'PDF data is required',
// //         code: 'MISSING_PDF_DATA'
// //       });
// //     }
    
// //     logger.info(`PDF extraction requested for: ${fileName}`);
    
// //     // Convert base64 to buffer
// //     const pdfBuffer = Buffer.from(base64Data, 'base64');
// //     logger.debug(`PDF buffer size: ${pdfBuffer.length} bytes`);
    
// //     // Use the actual PDF extraction service
// //     const extractedData = await extractDataFromPDF(pdfBuffer);
    
// //     logger.info('PDF extraction completed successfully');
// //     logger.debug('Extracted data summary:', {
// //       jobNumber: extractedData.jobNumber,
// //       partner: extractedData.partner,
// //       manager: extractedData.manager,
// //       clientName: extractedData.familyMembers?.[0]?.clientName
// //     });
    
// //     res.json({
// //       success: true,
// //       data: extractedData
// //     });
    
// //   } catch (error) {
// //     logger.error('PDF extraction error:', error);
// //     res.status(500).json({
// //       success: false,
// //       error: 'PDF extraction failed',
// //       message: error.message,
// //       code: 'EXTRACTION_FAILED'
// //     });
// //   }
// // };

// // // Extract data from uploaded PDF files
// // const extractPDFFiles = async (req, res) => {
// //   try {
// //     const files = req.files;
    
// //     if (!files || files.length === 0) {
// //       return res.status(400).json({
// //         success: false,
// //         error: 'No PDF files uploaded',
// //         code: 'NO_FILES'
// //       });
// //     }
    
// //     logger.info(`Processing ${files.length} uploaded PDF files`);
    
// //     // Convert uploaded files to buffers
// //     const pdfBuffers = files.map(file => file.buffer);
    
// //     // Extract data from all PDFs
// //     let extractedData;
// //     if (files.length === 1) {
// //       // Single file - use single extraction
// //       extractedData = await extractDataFromPDF(pdfBuffers[0]);
// //     } else {
// //       // Multiple files - use multi-PDF extraction
// //       extractedData = await extractDataFromMultiplePDFs(pdfBuffers);
// //     }
    
// //     logger.info('PDF files extraction completed successfully');
    
// //     res.json({
// //       success: true,
// //       processed: files.length,
// //       data: extractedData
// //     });
    
// //   } catch (error) {
// //     logger.error('PDF files extraction error:', error);
// //     res.status(500).json({
// //       success: false,
// //       error: 'PDF files extraction failed',
// //       message: error.message,
// //       code: 'EXTRACTION_FAILED'
// //     });
// //   }
// // };

// // module.exports = {
// //   extractPDF,
// //   extractPDFFiles
// // };



// // src/controllers/extractController.js

// const multer = require('multer');
// const { extractPDFData } = require('../services/pdfExtractor');
// const logger = require('../utils/logger');

// // Configure multer for memory storage
// const storage = multer.memoryStorage();
// const upload = multer({
//   storage: storage,
//   limits: {
//     fileSize: 10 * 1024 * 1024, // 10MB limit
//   },
//   fileFilter: (req, file, cb) => {
//     if (file.mimetype === 'application/pdf') {
//       cb(null, true);
//     } else {
//       cb(new Error('Only PDF files are allowed'), false);
//     }
//   }
// }).single('file');

// /**
//  * Extract data from uploaded PDF
//  */
// const extractPDF = async (req, res) => {
//   upload(req, res, async (err) => {
//     if (err) {
//       logger.error('File upload error:', err);
//       return res.status(400).json({
//         status: 'error',
//         message: err.message || 'File upload failed'
//       });
//     }

//     if (!req.file) {
//       return res.status(400).json({
//         status: 'error',
//         message: 'No file uploaded'
//       });
//     }

//     try {
//       logger.info('Processing PDF extraction', {
//         filename: req.file.originalname,
//         size: req.file.size,
//         user: req.user.email
//       });

//       // Extract data from PDF
//       const extractedData = await extractPDFData(req.file.buffer);
      
//       // Log successful extraction
//       logger.info('PDF extraction successful', {
//         filename: req.file.originalname,
//         extractedFields: Object.keys(extractedData).filter(key => extractedData[key])
//       });

//       return res.status(200).json({
//         status: 'success',
//         message: 'PDF data extracted successfully',
//         data: extractedData
//       });
//     } catch (error) {
//       logger.error('PDF extraction failed:', error);
//       return res.status(500).json({
//         status: 'error',
//         message: 'Failed to extract PDF data',
//         error: process.env.NODE_ENV === 'development' ? error.message : undefined
//       });
//     }
//   });
// };

// module.exports = {
//   extractPDF
// };


// src/controllers/extractController.js

// src/controllers/extractController.js

const multer = require('multer');
const { extractPDFData } = require('../services/pdfExtractor');
const logger = require('../utils/logger');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// Middleware for handling file upload
const uploadMiddleware = upload.single('file');

/**
 * Extract data from uploaded PDF
 */
const extractPDF = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 'error',
        message: 'No file uploaded'
      });
    }

    logger.info('Processing PDF extraction', {
      filename: req.file.originalname,
      size: req.file.size,
      user: req.user.email
    });

    // Extract data from PDF
    const extractedData = await extractPDFData(req.file.buffer);
    
    // Log successful extraction
    logger.info('PDF extraction successful', {
      filename: req.file.originalname,
      extractedFields: Object.keys(extractedData).filter(key => extractedData[key])
    });

    return res.status(200).json({
      status: 'success',
      message: 'PDF data extracted successfully',
      data: extractedData
    });
  } catch (error) {
    logger.error('PDF extraction failed:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to extract PDF data',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

module.exports = {
  extractPDF,
  uploadMiddleware
};