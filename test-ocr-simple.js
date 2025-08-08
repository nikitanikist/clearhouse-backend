const fs = require('fs');
const { createWorker } = require('tesseract.js');

async function testTesseractOnly() {
  try {
    console.log('\n🔍 TESTING TESSERACT.JS ONLY');
    
    // Test if Tesseract.js can initialize
    console.log('🔄 Initializing Tesseract worker...');
    const worker = await createWorker('eng');
    console.log('✅ Tesseract worker initialized successfully');
    
    // Test with a simple text recognition
    console.log('🔄 Testing text recognition...');
    const { data: { text } } = await worker.recognize('https://tesseract.projectnaptha.com/img/eng_bw.png');
    console.log('✅ Text recognition test successful');
    console.log('📝 Recognized text:', text.substring(0, 100) + '...');
    
    await worker.terminate();
    console.log('✅ Tesseract worker terminated');
    
    return { success: true, message: 'Tesseract.js is working correctly' };
    
  } catch (error) {
    console.error('❌ Tesseract test failed:', error);
    return { success: false, error: error.message };
  }
}

async function testGraphicsMagick() {
  try {
    console.log('\n🔍 TESTING GRAPHICSMAGICK');
    
    // Test if GraphicsMagick is accessible
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);
    
    console.log('🔄 Testing GraphicsMagick command...');
    const { stdout } = await execAsync('gm version');
    console.log('✅ GraphicsMagick is working:');
    console.log(stdout.substring(0, 200) + '...');
    
    return { success: true, message: 'GraphicsMagick is working correctly' };
    
  } catch (error) {
    console.error('❌ GraphicsMagick test failed:', error);
    return { success: false, error: error.message };
  }
}

async function runAllTests() {
  console.log('🚀 STARTING OCR COMPONENT TESTS');
  
  const tesseractResult = await testTesseractOnly();
  const graphicsMagickResult = await testGraphicsMagick();
  
  console.log('\n📊 TEST RESULTS:');
  console.log('Tesseract.js:', tesseractResult.success ? '✅ PASS' : '❌ FAIL');
  console.log('GraphicsMagick:', graphicsMagickResult.success ? '✅ PASS' : '❌ FAIL');
  
  if (tesseractResult.success && graphicsMagickResult.success) {
    console.log('\n🎉 All components are working! Ready for OCR testing.');
  } else {
    console.log('\n⚠️ Some components need attention before OCR will work.');
  }
}

runAllTests().catch(console.error); 