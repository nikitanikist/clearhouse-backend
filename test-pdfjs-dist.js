const fs = require('fs');
const path = require('path');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

async function extractWithPdfjsDist(pdfPath) {
  try {
    if (!fs.existsSync(pdfPath)) {
      console.error('❌ PDF file does not exist:', pdfPath);
      return { allText: [], allFields: [] };
    }
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdfDocument = await loadingTask.promise;
    console.log(`✅ PDF loaded. Number of pages: ${pdfDocument.numPages}`);

    let allText = [];
    let allFields = [];

    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(' ');
      allText.push(`--- Page ${pageNum} ---\n${pageText}`);
    }

    // Try to extract form fields (AcroForm)
    if (pdfDocument.acroForm) {
      const fields = pdfDocument.acroForm.getFields();
      for (const field of fields) {
        allFields.push({
          name: field.getName(),
          value: field.getValue(),
        });
      }
    }

    return { allText, allFields };
  } catch (err) {
    console.error('❌ Error during PDF extraction:', err);
    return { allText: [], allFields: [] };
  }
}

async function main() {
  const pdfPath = path.join(__dirname, 'Wanda Terminal Retun1.124 Wanda Zdasiuk T1 General.pdf');
  console.log('🧪 Extracting with pdfjs-dist:', pdfPath);
  const { allText, allFields } = await extractWithPdfjsDist(pdfPath);

  if (allText.length === 0) {
    console.log('⚠️ No text extracted from PDF.');
  } else {
    allText.forEach((page, idx) => {
      console.log(`\nPage ${idx + 1} Text:\n${page}`);
    });
  }

  if (allFields.length > 0) {
    console.log('\nForm Fields Found:');
    allFields.forEach(field => {
      console.log(`  ${field.name}: ${field.value}`);
    });
  } else {
    console.log('\nNo form fields found.');
  }

  // Search for 'Email address' in text
  console.log('\n🔍 Searching for "Email address" in text:');
  let found = false;
  allText.forEach((page, idx) => {
    const lines = page.split(/\n|\r/);
    lines.forEach((line, lineIdx) => {
      if (line.toLowerCase().includes('email address')) {
        found = true;
        console.log(`Page ${idx + 1}, Line ${lineIdx + 1}: ${line}`);
      }
    });
  });
  if (!found) {
    console.log('No lines with "Email address" found in extracted text.');
  }
}

main().catch(console.error); 