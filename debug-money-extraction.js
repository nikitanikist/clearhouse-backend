// debug-money-extraction.js
const { extractMoneyValue } = require('./src/services/pdfExtractor');

const testText = `
Invoice Amount: $1,500.00
Professional Fees: $2,000.50
Invoice Amount      $1,500.00
Invoice Amount
$1,500.00
INVOICE AMOUNT: $1,500.00
`;

console.log('Testing money extraction...');
console.log('Text to search:');
console.log(testText);
console.log('\nResults:');

const result1 = extractMoneyValue(testText, 'Invoice Amount');
console.log('Invoice Amount:', result1);

const result2 = extractMoneyValue(testText, 'Professional Fees');
console.log('Professional Fees:', result2);

const result3 = extractMoneyValue(testText, 'INVOICE AMOUNT');
console.log('INVOICE AMOUNT (caps):', result3);

// Test the individual components
console.log('\nDebug individual patterns:');
const lines = testText.split('\n');
lines.forEach((line, i) => {
  if (line.toLowerCase().includes('invoice amount')) {
    console.log(`Line ${i}: "${line}"`);
    const dollarMatch = line.match(/\$([0-9,]+\.?[0-9]*)/);
    console.log('Dollar match:', dollarMatch);
  }
});
