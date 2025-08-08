
const fs = require('fs');
const pdfParse = require('pdf-parse');
const { fromPath } = require('pdf2pic');
const { createWorker } = require('tesseract.js');
const logger = require('../utils/logger');
const path = require('path');
const { extractDataFromLabels } = require('./labelExtractor');


async function extractTextHybrid(pdfPath) {
  // Try pdf-parse first
  const dataBuffer = fs.readFileSync(pdfPath);
  const data = await pdfParse(dataBuffer);
  if (data.text && data.text.trim().length > 50) {
    return data.text;
  }
  // Fallback to OCR
  const tempDir = './temp-images';
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
  const pdf2picOptions = {
    density: 300,
    saveFilename: 'page',
    savePath: tempDir,
    format: 'png',
    width: 2480,
    height: 3508,
  };
  const convert = fromPath(pdfPath, pdf2picOptions);
  const numPages = 1; // You can make this dynamic if needed
  let ocrText = '';
  const worker = await createWorker('eng');
  for (let i = 1; i <= numPages; i++) {
    const res = await convert(i);
    const { data: { text } } = await worker.recognize(res.path);
    ocrText += text + '\n';
    fs.unlinkSync(res.path);
  }
  await worker.terminate();
  fs.rmdirSync(tempDir, { recursive: true });
  return ocrText;
}

function extractIdentificationSection(text) {
  // Try to extract only the 'Step 1 – Identification and other information' section
  const startRegex = /Step 1[\s–-]+Identification and other information/i;
  const endRegex = /Step 2[\s–-]+Total income|Step 2[\s–-]+Net income/i;
  const startMatch = text.match(startRegex);
  if (!startMatch) return '';
  const startIdx = startMatch.index;
  let endIdx = text.length;
  const endMatch = text.slice(startIdx).match(endRegex);
  if (endMatch) endIdx = startIdx + endMatch.index;
  return text.slice(startIdx, endIdx);
}

function extractName(identificationSection) {
  const lines = identificationSection.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  // Expanded skip list
  const skipPhrases = [
    "Elections Canada", "Canada Revenue Agency", "Protected B", "Step", "Identification", "Mailing address",
    "RRPO Box", "PO Box", "City", "Province", "Postal code", "Date of birth", "Date of death", "Social insurance", "number (SIN)",
    "Marital status", "Language", "Correspondence", "Page", "Do not use", "Information", "Estate", "Partner",
    "Spouse", "Status", "Completed", "Section", "Email Address", "EnglishYour language of correspondence", "Votre langue de correspondance",
    "Divorced", "Married", "Single", "Widowed", "Separated", "Living common-law", "X", "Yes", "No", "1", "2", "3", "4", "5", "6"
  ];

  // 0. Look for lines like 'Mian, Farooq   SIN: 110 416 021'
  for (let line of lines) {
    let headerMatch = line.match(/^([A-Za-z .,'-]+),\s*([A-Za-z .,'-]+)\s+SIN:/i);
    if (headerMatch) {
      let name = `${headerMatch[1]} ${headerMatch[2]}`.replace(/,/g, '').replace(/\s+/g, ' ').trim();
      if (name.split(' ').length >= 2 && !skipPhrases.some(p => name.includes(p))) return name;
    }
    let altHeaderMatch = line.match(/^([A-Za-z .,'-]+)\s+SIN:/i);
    if (altHeaderMatch && !skipPhrases.some(p => altHeaderMatch[1].includes(p))) {
      let name = altHeaderMatch[1].replace(/,/g, '').replace(/\s+/g, ' ').trim();
      if (name.split(' ').length >= 2 && !skipPhrases.some(p => name.includes(p))) return name;
    }
  }

  // 1. Estate returns: after 'The Estate of the Late'
  for (let i = 0; i < lines.length; i++) {
    if (/^The Estate of the Late$/i.test(lines[i]) && lines[i+1]) {
      if (/^[A-Za-z .'-]+$/.test(lines[i+1]) && !skipPhrases.some(p => lines[i+1].includes(p))) {
        return lines[i+1].replace(/([a-z])([A-Z])/g, '$1 $2').trim();
      }
    }
  }

  // 2. Concatenated label: 'Last nameFirst name' or 'First nameLast name'
  for (let i = 0; i < lines.length; i++) {
    if (/^(Last nameFirst name|First nameLast name)$/i.test(lines[i]) && lines[i+1]) {
      let nameLine = lines[i+1].replace(/([a-z])([A-Z])/g, '$1 $2').trim();
      if (nameLine.split(' ').length >= 2 && !skipPhrases.some(p => nameLine.includes(p))) return nameLine;
    }
  }

  // 3. "First name" and "Last name" labels (same line or next line)
  let firstName = '', lastName = '';
  for (let i = 0; i < lines.length; i++) {
    let firstMatch = lines[i].match(/First name\s*:?\s*([A-Za-z'-]+)/i);
    if (firstMatch && firstMatch[1] && firstMatch[1].toLowerCase() !== 'first') firstName = firstMatch[1];
    let lastMatch = lines[i].match(/Last name\s*:?\s*([A-Za-z'-]+)/i);
    if (lastMatch && lastMatch[1] && lastMatch[1].toLowerCase() !== 'last') lastName = lastMatch[1];
    if (/^First name$/i.test(lines[i]) && lines[i+1] && /^[A-Za-z'-]+$/.test(lines[i+1]) && lines[i+1].toLowerCase() !== 'first') firstName = lines[i+1];
    if (/^Last name$/i.test(lines[i]) && lines[i+1] && /^[A-Za-z'-]+$/.test(lines[i+1]) && lines[i+1].toLowerCase() !== 'last') lastName = lines[i+1];
  }
  if (firstName && lastName) {
    const name = `${firstName} ${lastName}`;
    if (!skipPhrases.some(p => name.includes(p))) return name;
  }
  if (firstName && !skipPhrases.some(p => firstName.includes(p))) return firstName;

  // 4. Look for a name near SIN or address (within 3 lines before/after)
  for (let i = 0; i < lines.length; i++) {
    if (/sin|number \(sin\)/i.test(lines[i])) {
      for (let j = 1; j <= 3; j++) {
        if (lines[i-j] && /^[A-Z][a-zA-Z'-]+ [A-Z][a-zA-Z'-]+$/.test(lines[i-j]) && !skipPhrases.some(p => lines[i-j].includes(p))) {
          return lines[i-j];
        }
      }
      for (let j = 1; j <= 3; j++) {
        if (lines[i+j] && /^[A-Z][a-zA-Z'-]+ [A-Z][a-zA-Z'-]+$/.test(lines[i+j]) && !skipPhrases.some(p => lines[i+j].includes(p))) {
          return lines[i+j];
        }
      }
    }
  }

  // 5. Look for a single capitalized word (7+ chars) that is not a label, and is surrounded by address lines
  for (let i = 1; i < lines.length - 1; i++) {
    if (
      /^[A-Z][a-zA-Z'-]{6,}$/.test(lines[i]) &&
      !skipPhrases.some(p => lines[i].includes(p)) &&
      (/address|road|street|dr|ave|blvd|rd|way|court|cres|city|toronto|mississauga|etobicoke|postal|code|on|qc|bc|ab|mb|sk|ns|nb|nl|pe|yt|nt|nu/i.test(lines[i-1]) ||
       /address|road|street|dr|ave|blvd|rd|way|court|cres|city|toronto|mississauga|etobicoke|postal|code|on|qc|bc|ab|mb|sk|ns|nb|nl|pe|yt|nt|nu/i.test(lines[i+1]))
    ) {
      const spaced = lines[i].replace(/([a-z])([A-Z])/g, '$1 $2');
      if (!skipPhrases.some(p => spaced.includes(p))) return spaced;
    }
  }

  // 6. First line with two or more capitalized words (not a label or skip phrase)
  for (let line of lines) {
    if (
      /^[A-Z][a-zA-Z'-]+ [A-Z][a-zA-Z'-]+$/.test(line) &&
      !skipPhrases.some(p => line.includes(p)) &&
      line.split(' ').length === 2
    ) {
      return line;
    }
  }

  // 7. Fallback: previous logic (avoid "Email Address")
  for (let line of lines) {
    let fallback = line.match(/^([A-Z][a-z'-]+)\s+([A-Z][a-z'-]+)$/);
    if (
      fallback &&
      fallback[0] !== 'Email Address' &&
      !skipPhrases.some(p => fallback[0].includes(p)) &&
      fallback[0].split(' ').length === 2
    ) {
      return fallback[0];
    }
  }

  // 8. If nothing found, return "Name not found"
  return 'Name not found';
}

function extractEmail(fullText, identificationSection) {
  // Remove spaces and newlines around @ and .
  const cleanedText = fullText.replace(/\s*(@|\.)\s*/g, '$1');
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

  // 1. Search the entire cleaned text for all email addresses
  const emailMatches = cleanedText.match(emailPattern) || [];
  // 2. Filter out government emails
  const personalEmail = emailMatches.find(email =>
    !email.includes('canada.ca') &&
    !email.includes('cra-arc.gc.ca') &&
    !email.includes('gc.ca')
  );
  if (personalEmail) return personalEmail;
  // 3. Fallback: search the cleaned identification section for the first email
  const cleanedSection = identificationSection.replace(/\s*(@|\.)\s*/g, '$1');
  const emailMatchSection = cleanedSection.match(emailPattern);
  if (emailMatchSection) {
    const personalSectionEmail = emailMatchSection.find(email =>
      !email.includes('canada.ca') &&
      !email.includes('cra-arc.gc.ca') &&
      !email.includes('gc.ca')
    );
    if (personalSectionEmail) return personalSectionEmail;
    return emailMatchSection[0];
  }
  // 4. Not found
  return 'No email found';
}

function extractDateOfDeath(identificationSection) {
  const lines = identificationSection.split(/\r?\n/).map(l => l.trim());
  let dateLineIdx = -1;
  // Find the line with 'date of death'
  for (let i = 0; i < lines.length; i++) {
    if (/date of death/i.test(lines[i])) {
      dateLineIdx = i;
      break;
    }
  }
  if (dateLineIdx !== -1) {
    // Look for a date in the next 1-5 lines
    for (let j = 1; j <= 5; j++) {
      const nextLine = lines[dateLineIdx + j];
      if (!nextLine) continue;
      // Match YYYY-MM-DD, YYYY/MM/DD, or YYYY MM DD
      const dateMatch = nextLine.match(/(\d{4})[-\/ ](\d{2})[-\/ ](\d{2})/);
      if (dateMatch) {
        return `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
      }
    }
    // Fallback: look for a date pattern anywhere after the label
    for (let i = dateLineIdx + 1; i < lines.length; i++) {
      const dateMatch = lines[i].match(/(\d{4})[-\/ ](\d{2})[-\/ ](\d{2})/);
      if (dateMatch) {
        return `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
      }
    }
  }
  return null;
}

module.exports = async function section2PdfExtractor(pdfPath) {
  const text = await extractTextHybrid(pdfPath);
  const identificationSection = extractIdentificationSection(text);

  // Use improved, robust email and name extraction
  const email = extractEmail(text, identificationSection);
  const name = extractName(identificationSection);
  const dateOfDeath = extractDateOfDeath(identificationSection);

  // Deceased detection: check for 'The Estate of the Late' or date of death
  let notes = '';
  if (/The Estate of the Late/i.test(identificationSection) || dateOfDeath) {
    notes = 'This return is for a deceased person.';
  }

  // Label-based extraction for T1135, T1032, etc.
  let labelExtracted = {};
  try {
    // Simulate pdfToJson structure for labelExtractor
    const lines = text.split(/\r?\n/).map(line => line.trim());
    const pdfJson = {
      fullText: text,
      lines: lines,
      labelOccurrences: {}
    };
    // Use the same labels as in pdfToJson.js
    const labelsToFind = [
      'First name',
      'Last name',
      'First nameLast name',
      'Email address',
      'Email',
      '26600', // T1135
      '11600', // T1032
      '21000', // T1032
      'date of death',
      'non-residents',
      'Non-Residents'
    ];
    labelsToFind.forEach(label => {
      pdfJson.labelOccurrences[label] = lines
        .map((line, idx) => ({ line, idx }))
        .filter(obj => lineIncludesLabel(obj.line, label))
        .map(obj => ({
          lineNumber: obj.idx,
          lineText: obj.line,
          contextBefore: lines.slice(Math.max(0, obj.idx - 2), obj.idx),
          contextAfter: lines.slice(obj.idx + 1, Math.min(lines.length, obj.idx + 6))
        }));
    });
    // Debug print for 26600 labelOccurrences
    console.log('[DEBUG] labelOccurrences["26600"]:', pdfJson.labelOccurrences['26600']);
    labelExtracted = extractDataFromLabels(pdfJson);
    // Debug print for labelExtracted
    console.log('[DEBUG] labelExtracted:', labelExtracted);
  } catch (err) {
    console.error('Label-based extraction failed:', err);
  }

  // Prepare the extracted data object (include all text)
  const extracted = {
    filename: pdfPath.split(/[\\/]/).pop(),
    name,
    email,
    identificationSection,
    extractedText: text,
    notes,
    ...labelExtracted // Merge label-based fields (t1135, t1032, etc. and taxPayable48400/48500)
  };

  // Print the extracted data in pretty JSON format
  console.log('\n--- EXTRACTED DATA (PRETTY JSON) ---');
  console.log(JSON.stringify(extracted, null, 2));
  console.log('--- END EXTRACTED DATA ---\n');

  // Save the extracted data as a pretty JSON file for inspection in the main backend folder
  const safeFilename = extracted.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const outputFile = path.join(__dirname, '..', `${safeFilename}-extracted.json`);
  try {
    fs.writeFileSync(outputFile, JSON.stringify(extracted, null, 2));
  } catch (err) {
    console.error('Failed to write extracted JSON file:', err);
  }

  return extracted;
}

function lineIncludesLabel(line, label) {
  // Case-insensitive, ignore extra spaces
  const match = line.replace(/\s+/g, '').toLowerCase().includes(label.replace(/\s+/g, '').toLowerCase());
  if (label === '26600' && line.includes('26600')) {
    console.log('[DEBUG] Line containing 26600:', line);
    if (match) {
      console.log('[DEBUG] Matched 26600 label:', line);
    }
  }
  return match;
}


