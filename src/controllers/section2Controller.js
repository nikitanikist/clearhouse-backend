const section2PdfExtractor = require('../services/section2PdfExtractor');
const fs = require('fs').promises;
const path = require('path');

async function extractSection2Pdf(req, res) {
  console.log('=== Section 2 PDF Upload Request ===');
  console.log('File received:', req.file ? 'Yes' : 'No');
  
  if (!req.file) {
    console.error('No file provided in request');
    return res.status(400).json({ 
      success: false, 
      error: 'No file provided' 
    });
  }

  const filePath = req.file.path;
  console.log('File path:', filePath);
  console.log('File details:', {
    filename: req.file.filename,
    originalname: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype
  });

  try {
    // Check if file exists
    try {
      await fs.access(filePath);
      console.log('File exists at path:', filePath);
    } catch (err) {
      console.error('File does not exist at path:', filePath);
      throw new Error('Uploaded file not found');
    }

    // Extract data from PDF
    console.log('Starting PDF extraction...');
    const extractedData = await section2PdfExtractor(filePath);
    console.log('Extraction successful:', extractedData);

    // Clean up uploaded file
    try {
      await fs.unlink(filePath);
      console.log('Temp file cleaned up');
    } catch (cleanupError) {
      console.error('Failed to clean up temp file:', cleanupError);
      // Don't fail the request if cleanup fails
    }

    // Send response
    res.json({
      success: true,
      data: extractedData
    });

  } catch (error) {
    console.error('=== PDF EXTRACTION ERROR ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('===========================');

    // Try to clean up file if it exists
    try {
      await fs.unlink(filePath);
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError.message);
    }

    res.status(500).json({
      success: false,
      error: 'Failed to extract PDF data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

module.exports = {
  extractSection2Pdf
};