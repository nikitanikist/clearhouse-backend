const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');

// Change this to test different PDFs
const pdfPath = path.join(__dirname, 'Mian Farooq 1032 (1).pdf');

function extractEmailFromText(text) {
  // Split text into lines for easier processing
  const lines = text.split(/\r?\n/).map(line => line.trim());
  let email = '';

  // 1. Look for 'Email address' label and take the next non-empty line as email
  for (let i = 0; i < lines.length; i++) {
    if (/email address/i.test(lines[i])) {
      // Look ahead for the next non-empty line that looks like an email
      for (let j = i + 1; j < i + 5 && j < lines.length; j++) {
        const possible = lines[j];
        const match = possible.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (match) {
          email = match[0];
          break;
        }
      }
    }
    if (email) break;
  }

  // 2. Fallback: search for any email pattern anywhere in the text
  if (!email) {
    const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (match) email = match[0];
  }

  return email;
}

async function testPdfParse() {
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdfParse(dataBuffer);
    const email = extractEmailFromText(data.text);
    const result = { email };
    console.log('\n================ PDF TO JSON MAPPING ================\n');
    console.log(JSON.stringify(result, null, 2));
    fs.writeFileSync('pdf-parse-email-output.json', JSON.stringify(result, null, 2));
    console.log('\nJSON output saved to pdf-parse-email-output.json');
  } catch (err) {
    console.error('❌ Error during pdf-parse extraction:', err);
  }
}

testPdfParse(); 