// Save this as testController.js in clearhouse-backend directory
// Run with: node testController.js

console.log('Testing controller loading...\n');

try {
  console.log('1. Loading section2PdfExtractor...');
  const extractor = require('./src/services/section2PdfExtractor');
  console.log('   ✓ Extractor loaded:', extractor);
  console.log('   ✓ extractSection2Data function exists:', typeof extractor.extractSection2Data === 'function');
} catch (error) {
  console.error('   ✗ Error loading extractor:', error.message);
}

console.log('\n2. Loading section2Controller...');
try {
  const controller = require('./src/controllers/section2Controller');
  console.log('   ✓ Controller loaded:', controller);
  console.log('   ✓ extractSection2Pdf function exists:', typeof controller.extractSection2Pdf === 'function');
  
  if (!controller.extractSection2Pdf) {
    console.error('   ✗ ERROR: extractSection2Pdf is not exported from controller!');
  }
} catch (error) {
  console.error('   ✗ Error loading controller:', error.message);
  console.error('   Stack:', error.stack);
}

console.log('\nDone.');