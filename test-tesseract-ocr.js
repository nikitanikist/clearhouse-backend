const { fromPath } = require('pdf2pic');
const Tesseract = require('tesseract.js');
const path = require('path');
const fs = require('fs');

const pdfPath = path.join(__dirname, 'Wanda Terminal Retun1.124 Wanda Zdasiuk T1 General.pdf');
const outputImage = path.join(__dirname, 'wanda_page1.png');

async function convertPdfToImage(pdfPath, outputImage) {
  const options = {
    density: 200,
    saveFilename: 'wanda_page1',
    savePath: __dirname,
    format: 'png',
    width: 1654,
    height: 2339,
    quality: 100,
    page: 1
  };
  const storeAsImage = fromPath(pdfPath, options);
  const result = await storeAsImage(1, false);
  if (result && result.path) {
    console.log('✅ PDF page converted to image:', result.path);
    return result.path;
  } else {
    throw new Error('Failed to convert PDF to image');
  }
}

async function runOcrOnImage(imagePath) {
  console.log('🔍 Running OCR on image:', imagePath);
  const { data: { text } } = await Tesseract.recognize(imagePath, 'eng', {
    logger: m => console.log(m.status, m.progress)
  });
  return text;
}

(async () => {
  try {
    const imagePath = await convertPdfToImage(pdfPath, outputImage);
    const ocrText = await runOcrOnImage(imagePath);
    console.log('\n================ OCR EXTRACTED TEXT ================\n');
    console.log(ocrText);
    // Optionally, save OCR text to a file
    fs.writeFileSync('wanda-ocr-output.txt', ocrText);
    console.log('\nOCR text saved to wanda-ocr-output.txt');
  } catch (err) {
    console.error('❌ Error during OCR extraction:', err);
  }
})(); 