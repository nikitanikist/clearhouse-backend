const pdf = require('pdf-parse');
const fs = require('fs').promises;

async function debugNameExtraction(pdfPath) {
  try {
    const dataBuffer = await fs.readFile(pdfPath);
    const data = await pdf(dataBuffer);
    const text = data.text;
    
    console.log('\n🔍 DEBUGGING NAME EXTRACTION');
    console.log('PDF:', pdfPath);
    console.log('='.repeat(60));
    
    // Split text into lines
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    
    console.log('\n📋 FIRST 40 LINES OF PDF:');
    console.log('-'.repeat(60));
    lines.slice(0, 40).forEach((line, idx) => {
      console.log(`Line ${idx}: "${line}"`);
    });
    
    // Look for "ON" pattern
    console.log('\n🔍 LOOKING FOR "ON" PATTERN:');
    console.log('-'.repeat(60));
    for (let i = 0; i < lines.length; i++) {
      if (lines[i] === 'ON' || lines[i].endsWith('ON')) {
        console.log(`Found "ON" at line ${i}: "${lines[i]}"`);
        if (i + 1 < lines.length) {
          console.log(`  Next line (${i + 1}): "${lines[i + 1]}"`);
          
          // Check if it looks like a name
          const nameMatch = lines[i + 1].match(/^([A-Z][a-z]+)([A-Z][a-z]+)$/);
          if (nameMatch) {
            console.log(`  ✅ This looks like a name: ${nameMatch[1]} ${nameMatch[2]}`);
          } else {
            console.log(`  ❌ Next line doesn't match name pattern`);
          }
        }
        console.log('');
      }
    }
    
    // Look for "First name" labels and what's before them
    console.log('\n🔍 LOOKING FOR "First name" LABELS:');
    console.log('-'.repeat(60));
    for (let i = 1; i < lines.length; i++) {
      if (lines[i].match(/First\s*name/i)) {
        console.log(`Found "First name" at line ${i}: "${lines[i]}"`);
        console.log(`  Previous line (${i - 1}): "${lines[i - 1]}"`);
        if (i - 2 >= 0) {
          console.log(`  Two lines before (${i - 2}): "${lines[i - 2]}"`);
        }
        console.log('');
      }
    }
    
    // Look for concatenated names in first 50 lines
    console.log('\n🔍 LOOKING FOR CONCATENATED NAMES:');
    console.log('-'.repeat(60));
    const concatenatedNamePattern = /\b([A-Z][a-z]+)([A-Z][a-z]+)\b/g;
    const firstLines = lines.slice(0, 50).join(' ');
    const matches = [...firstLines.matchAll(concatenatedNamePattern)];
    
    matches.forEach((match, idx) => {
      const fullName = match[1] + ' ' + match[2];
      console.log(`${idx + 1}. Found: "${match[0]}" → "${fullName}"`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run it
const pdfPath = process.argv[2] || 'Mian Farooq 1032 (1).pdf';
debugNameExtraction(pdfPath);