const { extractSection2Data } = require('./src/services/section2PdfExtractor');
const path = require('path');

async function testSection2Extraction() {
  try {
    console.log('🧪 Testing Section2 extraction for Mia Farooq PDF...');
    
    // Test with Mia Farooq PDF
    const pdfPath = path.join(__dirname, 'Mian Farooq 1032 (1).pdf');
    
    const result = await extractSection2Data(pdfPath);
    
    console.log('\n📊 SECTION2 EXTRACTION RESULT:');
    console.log('='.repeat(50));
    console.log(JSON.stringify(result, null, 2));
    
    // Expected results for Mia Farooq:
    console.log('\n🎯 EXPECTED RESULTS:');
    console.log('- Name: "Farooq Mian"');
    console.log('- Email: "" (empty)');
    console.log('- T1135: "no" (box 2 selected)');
    console.log('- T1032: "yes" (value after 21000)');
    
  } catch (error) {
    console.error('❌ Error testing Section2 extraction:', error);
  }
}

testSection2Extraction(); 