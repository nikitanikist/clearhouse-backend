const { convertPdfToJson } = require('./src/services/pdfToJson');
const path = require('path');
const fs = require('fs');

async function testJsonExtraction() {
  try {
    console.log('🧪 Testing JSON extraction for Wanda Terminal Return PDF...');
    
    // Test with Wanda Terminal Return PDF
    const pdfPath = path.join(__dirname, 'Wanda Terminal Retun1.124 Wanda Zdasiuk T1 General.pdf');
    
    const jsonData = await convertPdfToJson(pdfPath);
    
    // Optionally, write the JSON to a file for inspection
    fs.writeFileSync('wanda-json-output.json', JSON.stringify(jsonData, null, 2));
    
    console.log('\n📊 JSON EXTRACTION RESULT:');
    console.log('='.repeat(50));
    
    // Show metadata
    console.log('📋 METADATA:');
    console.log(jsonData.metadata);
    
    // Show first 30 lines
    console.log('\n📝 FIRST 30 LINES:');
    jsonData.lines.slice(0, 30).forEach((line, index) => {
      console.log(`${index}: "${line.text}"`);
    });
    
    // Show label occurrences
    console.log('\n🏷️ LABEL OCCURRENCES:');
    Object.entries(jsonData.labelOccurrences).forEach(([label, occurrences]) => {
      if (occurrences.length > 0) {
        console.log(`\n${label}:`);
        occurrences.forEach(occ => {
          console.log(`  Line ${occ.lineNumber}: "${occ.lineText}"`);
          console.log(`  Context after:`, occ.contextAfter.slice(0, 3).map(l => l.text));
        });
      }
    });
    
    // Print all lines containing 'Email address' and the next 3 lines for context
    console.log('\n🔍 LINES WITH "Email address" AND CONTEXT:');
    jsonData.lines.forEach((line, index) => {
      if (line.text.toLowerCase().includes('email address')) {
        console.log(`\nLine ${index}: "${line.text}"`);
        for (let j = 1; j <= 3; j++) {
          if (jsonData.lines[index + j]) {
            console.log(`  Context +${j}: "${jsonData.lines[index + j].text}"`);
          }
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error testing JSON extraction:', error);
  }
}

testJsonExtraction(); 