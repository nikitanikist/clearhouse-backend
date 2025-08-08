/**
 * Extracts values from PDF JSON based on labels
 * @param {Object} pdfJson - The JSON structure from pdfToJson.js
 * @returns {Object} Extracted data
 */
function extractDataFromLabels(pdfJson) {
  console.log('🔍 Starting label-based extraction...');
  
  const extractedData = {
    name: '',
    email: '',
    isDeceased: false,
    returnType: 'T1', // Default
    t1135: false,
    t1032: false
  };
  
  // 1. EXTRACT NAME
  extractedData.name = extractName(pdfJson);
  
  // 2. EXTRACT EMAIL
  extractedData.email = extractEmail(pdfJson);
  
  // 3. CHECK IF DECEASED
  extractedData.isDeceased = checkIfDeceased(pdfJson);
  
  // 4. DETERMINE RETURN TYPE
  extractedData.returnType = determineReturnType(pdfJson, extractedData.isDeceased);
  
  // 5. CHECK T1135 (Foreign Property - Line 26600)
  extractedData.t1135 = checkT1135(pdfJson);
  
  // 6. CHECK T1032 (Pension Split - Lines 11600 OR 21000)
  extractedData.t1032 = checkT1032(pdfJson);

  // 7. EXTRACT TAX PAYABLE (48400/48500)
  const { taxPayable48400, taxPayable48500 } = extractTaxPayable(pdfJson);
  extractedData.taxPayable48400 = taxPayable48400;
  extractedData.taxPayable48500 = taxPayable48500;
  
  console.log('✅ Extraction complete:', extractedData);
  return extractedData;
}

/**
 * Extract name from First name/Last name labels
 */
function extractName(pdfJson) {
  console.log('\n📛 Extracting Name...');
  
  let firstName = '';
  let lastName = '';
  
  // Print all lines for debugging
  if (pdfJson.labelOccurrences['First nameLast name']) {
    console.log('[DEBUG] labelOccurrences["First nameLast name"]:', pdfJson.labelOccurrences['First nameLast name']);
  }
  if (pdfJson.labelOccurrences['First name']) {
    console.log('[DEBUG] labelOccurrences["First name"]:', pdfJson.labelOccurrences['First name']);
  }
  if (pdfJson.labelOccurrences['Last name']) {
    console.log('[DEBUG] labelOccurrences["Last name"]:', pdfJson.labelOccurrences['Last name']);
  }
  // Check for concatenated "First nameLast name" label first
  const concatenatedLabel = pdfJson.labelOccurrences['First nameLast name'];
  if (concatenatedLabel && concatenatedLabel.length > 0) {
    const occurrence = concatenatedLabel[0];
    const nextLines = occurrence.contextAfter;
    console.log('[DEBUG] Next lines after "First nameLast name":', nextLines);
    // The name usually appears in the next 1-3 lines
    for (let i = 0; i < Math.min(3, nextLines.length); i++) {
      const line = nextLines[i];
      console.log(`[DEBUG] Checking line for name: "${line}"`);
      
      // Check for concatenated name pattern (e.g., "FarooqMian")
      const concatenatedNameMatch = line.match(/^([A-Z][a-z]+)([A-Z][a-z]+)$/);
      if (concatenatedNameMatch) {
        firstName = concatenatedNameMatch[1];
        lastName = concatenatedNameMatch[2];
        console.log('Found concatenated name:', firstName, lastName);
        break;
      }
      
      // Check for regular name pattern
      const nameMatch = line.match(/^([A-Z][a-z]+)\s+([A-Z][a-z]+)$/);
      if (nameMatch) {
        firstName = nameMatch[1];
        lastName = nameMatch[2];
        console.log('Found regular name:', firstName, lastName);
        break;
      }
    }
  }
  
  // If not found, try separate labels
  if (!firstName || !lastName) {
    const firstNameLabel = pdfJson.labelOccurrences['First name'];
    const lastNameLabel = pdfJson.labelOccurrences['Last name'];
    
    if (firstNameLabel && firstNameLabel.length > 0) {
      const occurrence = firstNameLabel[0];
      const sameLine = occurrence.lineText;
      console.log('[DEBUG] Checking "First name" line:', sameLine);
      // Extract first name
      const sameLineMatch = sameLine.match(/First\s+name\s*:?\s*([A-Z][a-z]+)/i);
      if (sameLineMatch) {
        firstName = sameLineMatch[1];
      } else {
        // Check next lines
        for (const line of occurrence.contextAfter) {
          console.log('[DEBUG] Checking line after "First name":', line);
          if (line && line.match(/^[A-Z][a-z]+$/)) {
            firstName = line;
            break;
          }
        }
      }
    }
    
    if (lastNameLabel && lastNameLabel.length > 0) {
      const occurrence = lastNameLabel[0];
      const sameLine = occurrence.lineText;
      console.log('[DEBUG] Checking "Last name" line:', sameLine);
      // Extract last name (similar logic)
      const sameLineMatch = sameLine.match(/Last\s+name\s*:?\s*([A-Z][a-z]+)/i);
      if (sameLineMatch) {
        lastName = sameLineMatch[1];
      } else {
        for (const line of occurrence.contextAfter) {
          console.log('[DEBUG] Checking line after "Last name":', line);
          if (line && line.match(/^[A-Z][a-z]+$/)) {
            lastName = line;
            break;
          }
        }
      }
    }
  }
  
  // Fallback: scan all lines for 'Lastname, Firstname   SIN:'
  if ((!firstName && !lastName) || (firstName && !lastName) || (!firstName && lastName)) {
    const lines = pdfJson.lines ? (Array.isArray(pdfJson.lines) ? pdfJson.lines : []) : [];
    for (let i = 0; i < lines.length; i++) {
      const line = typeof lines[i] === 'string' ? lines[i] : lines[i].text || '';
      let headerMatch = line.match(/^([A-Za-z .,'-]+),\s*([A-Za-z .,'-]+)\s+SIN:/i);
      if (headerMatch) {
        let name = `${headerMatch[1]} ${headerMatch[2]}`.replace(/,/g, '').replace(/\s+/g, ' ').trim();
        if (name.split(' ').length >= 2) {
          console.log('[DEBUG] Fallback header name:', name);
          return name;
        }
      }
      let altHeaderMatch = line.match(/^([A-Za-z .,'-]+)\s+SIN:/i);
      if (altHeaderMatch) {
        let name = altHeaderMatch[1].replace(/,/g, '').replace(/\s+/g, ' ').trim();
        if (name.split(' ').length >= 2) {
          console.log('[DEBUG] Fallback alt header name:', name);
          return name;
        }
      }
    }
    // Final fallback: scan for concatenated name pattern
    for (let i = 0; i < lines.length; i++) {
      const line = typeof lines[i] === 'string' ? lines[i] : lines[i].text || '';
      const concatMatch = line.match(/^([A-Z][a-z]+)([A-Z][a-z]+)$/);
      if (concatMatch) {
        const name = concatMatch[1] + ' ' + concatMatch[2];
        console.log('[DEBUG] Fallback concatenated name:', name);
        return name;
      }
    }
  }
  
  // Final validation
  const invalidNames = ['First', 'Last', 'Name', 'Email', 'Address', 'Revenue', 'Agency', 'Canada'];
  if (invalidNames.includes(firstName) || invalidNames.includes(lastName)) {
    console.log('Invalid name detected, clearing...');
    return '';
  }
  
  const fullName = `${firstName} ${lastName}`.trim();
  console.log('Extracted name:', fullName || 'Not found');
  return fullName;
}

/**
 * Extract email address
 */
function extractEmail(pdfJson) {
  console.log('\n📧 Extracting Email...');
  
  // First check the full text for email pattern
  const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  const emailMatches = pdfJson.fullText.match(emailPattern);
  
  if (emailMatches) {
    // Filter out government emails
    const personalEmail = emailMatches.find(email => 
      !email.includes('canada.ca') && 
      !email.includes('cra-arc.gc.ca') &&
      !email.includes('gc.ca')
    );
    
    if (personalEmail) {
      console.log('Found email:', personalEmail);
      return personalEmail;
    }
  }
  
  // If no email found in full text, check near email label
  const emailLabel = pdfJson.labelOccurrences['Email address'] || pdfJson.labelOccurrences['Email'];
  if (emailLabel && emailLabel.length > 0) {
    const occurrence = emailLabel[0];
    
    // Check the next few lines
    for (const line of occurrence.contextAfter) {
      const emailMatch = line.match(emailPattern);
      if (emailMatch) {
        console.log('Found email near label:', emailMatch[0]);
        return emailMatch[0];
      }
    }
  }
  
  console.log('No email found');
  return '';
}

/**
 * Check if person is deceased
 */
function checkIfDeceased(pdfJson) {
  console.log('\n☠️ Checking if deceased...');
  
  const deathLabel = pdfJson.labelOccurrences['date of death'];
  if (deathLabel && deathLabel.length > 0) {
    const occurrence = deathLabel[0];
    const fullLine = occurrence.lineText;
    const contextAfter = occurrence.contextAfter.join(' ');
    
    // Look for date pattern (YYYY-MM-DD)
    const datePattern = /(\d{4}-\d{2}-\d{2})/;
    
    // Check in the same line
    if (datePattern.test(fullLine)) {
      console.log('Found death date in same line');
      return true;
    }
    
    // Check in next lines
    if (datePattern.test(contextAfter)) {
      console.log('Found death date in context');
      return true;
    }
  }
  
  console.log('Not deceased');
  return false;
}

/**
 * Determine return type (T1 or S216)
 */
function determineReturnType(pdfJson, isDeceased) {
  console.log('\n📋 Determining return type...');
  
  // If deceased, default to S216
  if (isDeceased) {
    console.log('Deceased person - defaulting to S216');
    return 'S216';
  }
  
  // Check if it's a non-resident return
  const nonResidentOccurrences = [
    ...(pdfJson.labelOccurrences['non-residents'] || []),
    ...(pdfJson.labelOccurrences['Non-Residents'] || [])
  ];
  
  if (nonResidentOccurrences.length > 0) {
    console.log('Non-resident form detected - S216');
    return 'S216';
  }
  
  // Also check in the first 200 characters (header area)
  const headerText = pdfJson.fullText.substring(0, 200).toLowerCase();
  if (headerText.includes('non-resident') || headerText.includes('non resident')) {
    console.log('Non-resident in header - S216');
    return 'S216';
  }
  
  console.log('Standard return - T1');
  return 'T1';
}

/**
 * Check T1135 (Foreign Property - Line 26600)
 */
function checkT1135(pdfJson) {
  console.log('\n🌍 Checking T1135 (Line 26600)...');
  const lines = pdfJson.lines || [];
  let found = false;
  for (let i = 0; i < lines.length; i++) {
    const line = typeof lines[i] === 'string' ? lines[i] : lines[i].text || '';
    if (/\b26600\b/.test(line)) {
      console.log('[T1135] Found 26600 line:', line);
      // Check this line and next 2 lines for Yes/No and mark
      let context = [line];
      if (i + 1 < lines.length) context.push(typeof lines[i+1] === 'string' ? lines[i+1] : lines[i+1].text || '');
      if (i + 2 < lines.length) context.push(typeof lines[i+2] === 'string' ? lines[i+2] : lines[i+2].text || '');
      const flat = context.join(' ').replace(/\s+/g, ' ');
      const yesIdx = flat.toLowerCase().indexOf('yes');
      const noIdx = flat.toLowerCase().indexOf('no');
      const markRegex = /[x✓✔•●]/gi;
      let match, marks = [];
      while ((match = markRegex.exec(flat)) !== null) marks.push(match.index);
      let yesMarked = false, noMarked = false;
      if (yesIdx !== -1 && noIdx !== -1 && marks.length > 0) {
        const yesDist = Math.min(...marks.map(m => Math.abs(m - yesIdx)));
        const noDist = Math.min(...marks.map(m => Math.abs(m - noIdx)));
        if (yesDist < noDist) yesMarked = true;
        else if (noDist < yesDist) noMarked = true;
      } else if (yesIdx !== -1 && marks.length > 0) {
        const yesDist = Math.min(...marks.map(m => Math.abs(m - yesIdx)));
        if (yesDist < 10) yesMarked = true;
      } else if (noIdx !== -1 && marks.length > 0) {
        const noDist = Math.min(...marks.map(m => Math.abs(m - noIdx)));
        if (noDist < 10) noMarked = true;
      }
      // Fallback: Yes/No on one line, mark on next
      if (!yesMarked && !noMarked) {
        if (context[1] && /yes\s*no/i.test(context[0]) && /[x✓✔•●]/i.test(context[1])) yesMarked = true;
        else if (context[0] && /yes\s*no/i.test(context[0]) && /[x✓✔•●]/i.test(context[2])) yesMarked = true;
      }
      if (yesMarked) {
        console.log('[T1135] YES (Yes box marked)');
        found = true;
        return true;
      } else if (noMarked) {
        console.log('[T1135] NO (No box marked)');
        found = true;
        return false;
      }
    }
  }
  if (!found) console.log('[T1135] NO (not found or ambiguous)');
  return false;
}

/**
 * Check T1032 (Pension Split - Lines 11600 OR 21000)
 */
function checkT1032(pdfJson) {
  console.log('\n💰 Checking T1032 (Lines 11600 OR 21000)...');
  const lines = pdfJson.lines || [];
  let has11600 = false;
  let has21000 = false;
  for (let i = 0; i < lines.length; i++) {
    const line = typeof lines[i] === 'string' ? lines[i] : lines[i].text || '';
    // 11600
    if (/\b11600\b/.test(line)) {
      console.log('[T1032] Found 11600 line:', line);
      // Look for a value after 11600 (same line or next line)
      let value = null;
      const sameLineMatch = line.match(/11600\s+([\d,\.]+)/);
      if (sameLineMatch && sameLineMatch[1]) value = sameLineMatch[1].replace(/[,\s]/g, '');
      else if (i + 1 < lines.length) {
        const nextLine = typeof lines[i+1] === 'string' ? lines[i+1] : lines[i+1].text || '';
        const nextLineMatch = nextLine.match(/([\d,\.]+)/);
        if (nextLineMatch && nextLineMatch[1]) value = nextLineMatch[1].replace(/[,\s]/g, '');
      }
      if (value && parseFloat(value) > 0) {
        console.log('[T1032] 11600 has value:', value);
        has11600 = true;
      }
    }
    // 21000
    if (/\b21000\b/.test(line)) {
      console.log('[T1032] Found 21000 line:', line);
      let value = null;
      const sameLineMatch = line.match(/21000\s+([\d,\.]+)/);
      if (sameLineMatch && sameLineMatch[1]) value = sameLineMatch[1].replace(/[,\s]/g, '');
      else if (i + 1 < lines.length) {
        const nextLine = typeof lines[i+1] === 'string' ? lines[i+1] : lines[i+1].text || '';
        const nextLineMatch = nextLine.match(/([\d,\.]+)/);
        if (nextLineMatch && nextLineMatch[1]) value = nextLineMatch[1].replace(/[,\s]/g, '');
      }
      if (value && parseFloat(value) > 0) {
        console.log('[T1032] 21000 has value:', value);
        has21000 = true;
      }
    }
  }
  const result = has11600 || has21000;
  console.log(`[T1032] Result: ${result ? 'YES' : 'NO'} (11600: ${has11600}, 21000: ${has21000})`);
  return result;
}

/**
 * Extract tax payable/refund from 48400 (refund) and 48500 (balance owing)
 */
function extractTaxPayable(pdfJson) {
  const lines = pdfJson.lines || [];
  let taxPayable48400 = null;
  let taxPayable48500 = null;
  for (let i = 0; i < lines.length; i++) {
    const line = typeof lines[i] === 'string' ? lines[i] : lines[i].text || '';
    // 48400 (Refund)
    if (/\b48400\b/.test(line)) {
      console.log('[DEBUG] 48400 line:', line);
      // Try to find a value after 48400 on the same line (allow extra words/spaces)
      let value = null;
      const sameLineMatch = line.match(/48400[^\d\-]*([\-]?\d[\d, .]*)/);
      if (sameLineMatch && sameLineMatch[1]) {
        value = sameLineMatch[1];
      } else if (i + 1 < lines.length) {
        // If not found, check the next line for a number
        const nextLine = typeof lines[i+1] === 'string' ? lines[i+1] : lines[i+1].text || '';
        console.log('[DEBUG] 48400 next line:', nextLine);
        const nextLineMatch = nextLine.match(/([\-]?\d[\d, .]*)/);
        if (nextLineMatch && nextLineMatch[1]) value = nextLineMatch[1];
      }
      // Convert Canadian format (5,697 21 -> 5697.21)
      if (value) {
        value = value.replace(/,/g, '');
        // Replace last space with dot for decimals
        value = value.replace(/ (\d{2})$/, '.$1');
        // If value is just '48400' or '48500', ignore it
        if (value === '48400' || value === '48500') value = '';
      }
      if (value && !isNaN(parseFloat(value))) {
        taxPayable48400 = -Math.abs(parseFloat(value)); // Refund is negative
      } else {
        taxPayable48400 = null;
      }
    }
    // 48500 (Balance Owing)
    if (/\b48500\b/.test(line)) {
      console.log('[DEBUG] 48500 line:', line);
      let value = null;
      const sameLineMatch = line.match(/48500[^\d\-]*([\-]?\d[\d, .]*)/);
      if (sameLineMatch && sameLineMatch[1]) {
        value = sameLineMatch[1];
      } else if (i + 1 < lines.length) {
        const nextLine = typeof lines[i+1] === 'string' ? lines[i+1] : lines[i+1].text || '';
        console.log('[DEBUG] 48500 next line:', nextLine);
        const nextLineMatch = nextLine.match(/([\-]?\d[\d, .]*)/);
        if (nextLineMatch && nextLineMatch[1]) value = nextLineMatch[1];
      }
      // Convert Canadian format (5,697 21 -> 5697.21)
      if (value) {
        value = value.replace(/,/g, '');
        value = value.replace(/ (\d{2})$/, '.$1');
        if (value === '48400' || value === '48500') value = '';
      }
      if (value && !isNaN(parseFloat(value))) {
        taxPayable48500 = Math.abs(parseFloat(value)); // Owing is positive
      }
    }
  }
  return { taxPayable48400, taxPayable48500 };
}

module.exports = { extractDataFromLabels };