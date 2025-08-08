const fs = require('fs');
const path = require('path');
const pdf2pic = require('pdf2pic');
const { createWorker } = require('tesseract.js');

async function testOCRWithPdf(pdfPath) {
  try {
    console.log('\n🔍 TESTING OCR EXTRACTION');
    console.log('📄 PDF Path:', pdfPath);
    
    // Check if PDF exists
    if (!fs.existsSync(pdfPath)) {
      console.error('❌ PDF file not found:', pdfPath);
      return;
    }

    // Configure pdf2pic
    const options = {
      density: 300,           // Higher density for better OCR
      saveFilename: "page",
      savePath: "./temp-images",
      format: "png",
      width: 2480,           // A4 width at 300 DPI
      height: 3508           // A4 height at 300 DPI
    };

    // Create temp directory if it doesn't exist
    const tempDir = './temp-images';
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    console.log('🔄 Converting PDF to images...');
    const convert = pdf2pic.fromPath(pdfPath, options);
    
    // Convert first 3 pages (most likely to contain email)
    const pages = [1, 2, 3];
    let allExtractedText = '';
    
    for (const pageNum of pages) {
      try {
        console.log(`📄 Converting page ${pageNum}...`);
        const result = await convert(pageNum);
        
        if (result && result.path) {
          console.log(`✅ Page ${pageNum} converted to: ${result.path}`);
          
          // Extract text using Tesseract.js
          console.log(`🔍 Running OCR on page ${pageNum}...`);
          const worker = await createWorker('eng');
          
          const { data: { text } } = await worker.recognize(result.path);
          console.log(`📝 Extracted text from page ${pageNum}:`);
          console.log('--- START OF TEXT ---');
          console.log(text.substring(0, 500) + (text.length > 500 ? '...' : ''));
          console.log('--- END OF TEXT ---');
          
          allExtractedText += text + '\n';
          
          await worker.terminate();
          
          // Clean up the image file
          fs.unlinkSync(result.path);
          console.log(`🗑️ Cleaned up: ${result.path}`);
        }
      } catch (pageError) {
        console.log(`⚠️ Error processing page ${pageNum}:`, pageError.message);
        break; // Stop if we can't process more pages
      }
    }

    // Search for email in all extracted text
    console.log('\n🔍 SEARCHING FOR EMAIL ADDRESSES...');
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const emails = allExtractedText.match(emailRegex);
    
    if (emails && emails.length > 0) {
      console.log('✅ FOUND EMAIL ADDRESSES:');
      emails.forEach((email, index) => {
        console.log(`   ${index + 1}. ${email}`);
      });
    } else {
      console.log('❌ No email addresses found in the extracted text');
    }

    // Search for email-related keywords
    console.log('\n🔍 SEARCHING FOR EMAIL-RELATED KEYWORDS...');
    const emailKeywords = ['email', 'Email', 'EMAIL', 'e-mail', 'E-mail'];
    const foundKeywords = [];
    
    emailKeywords.forEach(keyword => {
      if (allExtractedText.toLowerCase().includes(keyword.toLowerCase())) {
        foundKeywords.push(keyword);
      }
    });
    
    if (foundKeywords.length > 0) {
      console.log('✅ FOUND EMAIL KEYWORDS:', foundKeywords.join(', '));
    } else {
      console.log('❌ No email keywords found');
    }

    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log('🗑️ Cleaned up temp directory');
    }

    console.log('\n✅ OCR TEST COMPLETED');
    return {
      success: true,
      emails: emails || [],
      hasEmailKeywords: foundKeywords.length > 0,
      totalTextLength: allExtractedText.length
    };

  } catch (error) {
    console.error('❌ OCR TEST FAILED:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Test with a specific PDF
const testPdfPath = process.argv[2] || './Wanda Terminal Retun1.124 Wanda Zdasiuk T1 General.pdf';

if (!testPdfPath) {
  console.log('Usage: node test-ocr-complete.js <path-to-pdf>');
  console.log('Example: node test-ocr-complete.js "./Wanda Terminal Retun1.124 Wanda Zdasiuk T1 General.pdf"');
  process.exit(1);
}

testOCRWithPdf(testPdfPath)
  .then(result => {
    console.log('\n📊 FINAL RESULT:', result);
  })
  .catch(error => {
    console.error('❌ Script failed:', error);
  }); 