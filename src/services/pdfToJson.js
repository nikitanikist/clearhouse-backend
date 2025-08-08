const pdf = require('pdf-parse');
const fs = require('fs').promises;

/**
 * Converts PDF to structured JSON format with text and metadata
 * @param {string} filePath - Path to the PDF file
 * @returns {Object} Structured JSON with all PDF content
 */
async function convertPdfToJson(filePath) {
  try {
    console.log('📄 Converting PDF to JSON:', filePath);
    
    const dataBuffer = await fs.readFile(filePath);
    const pdfData = await pdf(dataBuffer);
    
    // Split the entire text into lines
    const allLines = pdfData.text.split('\n').map(line => line.trim());
    
    // Create structured JSON
    const jsonStructure = {
      metadata: {
        totalPages: pdfData.numpages,
        pdfVersion: pdfData.version,
        extractedAt: new Date().toISOString(),
        filePath: filePath
      },
      fullText: pdfData.text,
      lines: allLines.map((text, index) => ({
        lineNumber: index,
        text: text,
        isEmpty: text.length === 0
      })),
      // Store text as one continuous string for pattern matching
      continuousText: pdfData.text.replace(/\n/g, ' '),
      // Store all occurrences of important labels
      labelOccurrences: {}
    };
    
    // Find all occurrences of important labels
    const labelsToFind = [
      'First name',
      'Last name',
      'First nameLast name', // Sometimes concatenated
      'Email address',
      'Email',
      '26600', // T1135
      '11600', // T1032
      '21000', // T1032
      'date of death',
      'non-residents',
      'Non-Residents'
    ];
    
    // Find each label's occurrences
    labelsToFind.forEach(label => {
      jsonStructure.labelOccurrences[label] = findLabelOccurrences(allLines, label);
    });
    
    console.log('✅ PDF converted to JSON successfully');
    console.log(`📊 Total lines: ${allLines.length}`);
    console.log(`📊 Labels found:`, Object.keys(jsonStructure.labelOccurrences).filter(
      label => jsonStructure.labelOccurrences[label].length > 0
    ));
    
    return jsonStructure;
    
  } catch (error) {
    console.error('❌ Error converting PDF to JSON:', error);
    throw error;
  }
}

/**
 * Find all occurrences of a label in the lines array
 * @param {Array} lines - Array of text lines
 * @param {string} label - Label to search for
 * @returns {Array} Array of occurrences with line numbers and context
 */
function findLabelOccurrences(lines, label) {
  const occurrences = [];
  
  lines.forEach((line, index) => {
    if (line.toLowerCase().includes(label.toLowerCase())) {
      occurrences.push({
        lineNumber: index,
        lineText: line,
        // Get context: 2 lines before and 5 lines after
        contextBefore: lines.slice(Math.max(0, index - 2), index),
        contextAfter: lines.slice(index + 1, Math.min(lines.length, index + 6))
      });
    }
  });
  
  return occurrences;
}

module.exports = { convertPdfToJson };