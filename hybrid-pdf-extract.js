const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { fromPath } = require('pdf2pic');
const { createWorker } = require('tesseract.js');

async function extractTextWithOCR(pdfPath) {
  // 1. Try pdf-parse first
  const dataBuffer = fs.readFileSync(pdfPath);
  const data = await pdfParse(dataBuffer);
  if (data.text && data.text.trim().length > 50) {
    console.log('✅ Extracted text with pdf-parse');
    return data.text;
  }

  // 2. If no text, use OCR
  console.log('⚠️ No text found with pdf-parse, using OCR...');
  const tempDir = path.join(__dirname, 'temp-images');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

  const pdf2picOptions = {
    density: 200,
    saveFilename: 'page',
    savePath: tempDir,
    format: 'png',
    width: 1654,
    height: 2339,
  };

  const convert = fromPath(pdfPath, pdf2picOptions);
  let numPages = 1;
  try {
    numPages = data.numpages || 1;
  } catch (e) {}
  let fullText = '';

  const worker = await createWorker('eng');
  for (let i = 1; i <= numPages; i++) {
    console.log(`Converting page ${i} to image...`);
    const output = await convert(i);
    console.log(`Running OCR on page ${i}...`);
    const { data: { text } } = await worker.recognize(output.path);
    fullText += text + '\n';
    fs.unlinkSync(output.path); // Clean up image
  }
  await worker.terminate();
  fs.rmdirSync(tempDir, { recursive: true });
  console.log('✅ Extracted text with OCR');
  return fullText;
}

function extractIdentificationSection(text) {
  // Try to find the section between "Step 1 – Identification and other information" and the next "Step" or "Page"
  const match = text.match(/Step 1[\s\S]*?Identification[\s\S]*?information[\s\S]*?(?=Step 2|Page \d|Step 3|$)/i);
  return match ? match[0] : '';
}

function extractEmailFromSection(section) {
  const lines = section.split('\n');
  let email = '';
  for (let i = 0; i < lines.length; i++) {
    if (/email address/i.test(lines[i])) {
      for (let j = 1; j <= 5; j++) {
        if (i + j < lines.length) {
          const match = lines[i + j].match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
          if (match) {
            email = match[0];
            break;
          }
        }
      }
      if (email) break;
    }
  }
  // Fallback: search whole section if not found after label
  if (!email) {
    const match = section.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (match) email = match[0];
  }
  return email;
}

// Usage example:
(async () => {
  const pdfPath = process.argv[2] || 'sample.pdf'; // Pass PDF path as argument
  if (!fs.existsSync(pdfPath)) {
    console.error('❌ PDF file not found:', pdfPath);
    process.exit(1);
  }
  const text = await extractTextWithOCR(pdfPath);
  const identificationSection = extractIdentificationSection(text);
  const email = extractEmailFromSection(identificationSection);
  const result = {
    filename: path.basename(pdfPath),
    extractedText: text,
    identificationSection,
    email
  };
  const outFile = path.basename(pdfPath, path.extname(pdfPath)) + '-extracted.json';
  fs.writeFileSync(outFile, JSON.stringify(result, null, 2));
  console.log(`\n--- Extraction JSON saved to ${outFile} ---`);
  console.log(JSON.stringify(result, null, 2));
})(); 