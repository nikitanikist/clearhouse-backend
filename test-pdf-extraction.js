// test-pdf-extraction.js
const { extractDataFromPDF } = require('./src/services/pdfExtractor');
const fs = require('fs');
const path = require('path');

// Simple test text that simulates a PDF with various field formats
const testPDFText = `
Job Details - Smith, John (12345)

Partner: Sarah Johnson
Job Manager: Mike Wilson
Job ID: T1-2024-001

Client Name: John Smith
Email: john.smith@email.com
Tax Year: 2024

Invoice Amount: $2,500.00
Service Description: Personal Tax Return Preparation

Job Partner ABC Corp
Job Manager: Jane Doe  
File Number XYZ-789

Payment Required: Yes
T1 General: Yes
`;

// Mock pdf-parse to return our test text
jest.mock('pdf-parse', () => {
  return jest.fn().mockResolvedValue({
    text: testPDFText,
    numpages: 1,
    numrender: 1
  });
});

// Test the extraction
async function testExtraction() {
  try {
    console.log('Testing PDF extraction...');
    
    // Create a dummy buffer (pdf-parse is mocked)
    const dummyBuffer = Buffer.from('dummy pdf content');
    
    const result = await extractDataFromPDF(dummyBuffer);
    
    console.log('Extraction Results:');
    console.log('==================');
    console.log('Partner:', result.partner);
    console.log('Manager:', result.manager);
    console.log('Job Number:', result.jobNumber);
    console.log('Client Name:', result.familyMembers[0]?.clientName);
    console.log('Email:', result.familyMembers[0]?.signingEmail);
    console.log('Invoice Amount:', result.invoiceAmount);
    console.log('Year:', result.years);
    
    // Test if key fields were extracted
    if (result.partner && result.manager && result.jobNumber) {
      console.log('\n✅ SUCCESS: Key fields extracted successfully!');
    } else {
      console.log('\n❌ WARNING: Some key fields missing:');
      if (!result.partner) console.log('  - Partner not found');
      if (!result.manager) console.log('  - Manager not found'); 
      if (!result.jobNumber) console.log('  - Job Number not found');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Only run test if this file is executed directly
if (require.main === module) {
  testExtraction();
}

module.exports = { testExtraction };
