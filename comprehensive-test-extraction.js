// comprehensive-test-extraction.js
const { extractValue, extractMoneyValue, isFieldChecked } = require('./src/services/pdfExtractor');

// Test various PDF formats that might be encountered
const testFormats = [
  {
    name: "Format 1: Colon separated",
    text: `
    Job Partner: John Smith
    Job Manager: Jane Doe  
    Job ID: ABC-123
    Invoice Amount: $1,500.00
    `
  },
  {
    name: "Format 2: Table-like with spaces",
    text: `
    Job Partner         John Smith
    Job Manager         Jane Doe
    Job ID              ABC-123  
    Invoice Amount      $1,500.00
    `
  },
  {
    name: "Format 3: Multi-line",
    text: `
    Job Partner
    John Smith
    
    Job Manager
    Jane Doe
    
    Job ID
    ABC-123
    
    Invoice Amount
    $1,500.00
    `
  },
  {
    name: "Format 4: Different labels",
    text: `
    Partner: John Smith
    Manager: Jane Doe
    File Number: ABC-123
    Professional Fees: $1,500.00
    `
  },
  {
    name: "Format 5: Brackets and special chars",
    text: `
    Job Partner [John Smith]
    Job Manager - Jane Doe
    Job ID = ABC-123
    Invoice Amount: $1,500.00
    `
  },
  {
    name: "Format 6: All caps",
    text: `
    JOB PARTNER: JOHN SMITH
    JOB MANAGER: JANE DOE
    JOB ID: ABC-123
    INVOICE AMOUNT: $1,500.00
    `
  }
];

console.log('Testing various PDF format patterns...');
console.log('=====================================\n');

testFormats.forEach((format, index) => {
  console.log(`Testing ${format.name}:`);
  console.log('-'.repeat(50));
  
  const partner = extractValue(format.text, 'Job Partner|Partner|Engagement Partner|Lead Partner|Responsible Partner|Partner:') || 
                  extractValue(format.text, 'Partner\\s*[:-]') || 
                  extractValue(format.text, 'PARTNER');
  
  const manager = extractValue(format.text, 'Job Manager|Manager|Engagement Manager|Job Mgr|Account Manager|Manager:') || 
                  extractValue(format.text, 'Manager\\s*[:-]') || 
                  extractValue(format.text, 'MANAGER|MGR');
  
  const jobNumber = extractValue(format.text, 'Job ID|Job Number|Job #|File Number|Job Code|Job Ref|Client ID|File ID|Reference|Ref:') || 
                    extractValue(format.text, 'JOB\\s*(?:ID|NUMBER|#|REF)') ||
                    extractValue(format.text, 'FILE\\s*(?:NUMBER|#|REF)') ||
                    extractValue(format.text, 'CLIENT\\s*(?:ID|REF)');
  
  const invoiceAmount = extractMoneyValue(format.text, 'Invoice Amount|Professional Fees|Invoiced|Fees') || '0';
  
  console.log('  Partner:', partner || '❌ NOT FOUND');
  console.log('  Manager:', manager || '❌ NOT FOUND');
  console.log('  Job Number:', jobNumber || '❌ NOT FOUND');
  console.log('  Invoice Amount:', invoiceAmount || '❌ NOT FOUND');
  
  const success = partner && manager && jobNumber && invoiceAmount !== '0';
  console.log('  Status:', success ? '✅ SUCCESS' : '❌ PARTIAL/FAILED');
  console.log('');
});

console.log('Comprehensive extraction test completed!');
