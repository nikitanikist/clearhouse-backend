// simple-test-extraction.js
const pdfParse = require('pdf-parse');

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

Alternative formats:
Job Partner ABC Corp
Manager Jane Doe  
File Number XYZ-789

Payment Required: Yes
T1 General: Yes
`;

// Test the individual extraction functions
const { extractValue, extractMoneyValue, isFieldChecked } = require('./src/services/pdfExtractor');

console.log('Testing PDF field extraction patterns...');
console.log('===========================================');

// Test partner extraction
const partner1 = extractValue(testPDFText, 'Partner');
const partner2 = extractValue(testPDFText, 'Job Partner');
console.log('Partner (format 1):', partner1);
console.log('Partner (format 2):', partner2);

// Test manager extraction  
const manager1 = extractValue(testPDFText, 'Job Manager');
const manager2 = extractValue(testPDFText, 'Manager');
console.log('Manager (format 1):', manager1);
console.log('Manager (format 2):', manager2);

// Test job number extraction
const jobNumber1 = extractValue(testPDFText, 'Job ID');
const jobNumber2 = extractValue(testPDFText, 'File Number');
console.log('Job Number (format 1):', jobNumber1);
console.log('Job Number (format 2):', jobNumber2);

// Test client name
const clientName = extractValue(testPDFText, 'Client Name');
console.log('Client Name:', clientName);

// Test invoice amount
const invoiceAmount = extractMoneyValue(testPDFText, 'Invoice Amount');
console.log('Invoice Amount:', invoiceAmount);

// Test year
const year = extractValue(testPDFText, 'Tax Year');
console.log('Tax Year:', year);

console.log('\n✅ Basic extraction tests completed!');
