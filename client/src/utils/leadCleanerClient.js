import axios from 'axios';

const SUPABASE_URL = 'https://qgxgtavkovqklijfpnfl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneGd0YXZrb3Zxa2xpamZwbmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjA1MzksImV4cCI6MjA5MzYzNjUzOX0.hbxMBy0qm8Q3WVQTE8218JhtGtdNm7a9rYCUisTRb08';

export const DUMMY_STRINGS = new Set([
  'null', 'n/a', 'na', 'none', '-', '--', '0', 'undefined', 'nil', 'unknown',
  '.', 'n.a', 'not available', 'table 1', 'unnamed', 'owner', 'tenant', 'nan'
]);

export const ACRONYMS_UPPERCASE = new Set([
  'LLC', 'PJSC', 'P.J.S.C', 'FZ-LLC', 'FZCO', 'DMCC', 'FZE', 'LTD'
]);

export const NEGATIVE_NAME_TERMS = [
  'building', 'project', 'procedure', 'type', 'community', 'tower',
  'location', 'plot', 'amount', 'size', 'beds', 'status', 'usage',
  'date', 'passport', 'unified', 'country', 'emirates', 'land', 'dm',
  'code', 'id', 'agent', 'agency', 'broker', 'company', 'bank', 'zone',
  'price', 'value', 'fee', 'regis', 'number', 'no'
];

export const NAME_TIER_1 = [
  'owner name', 'owner_name', 'nameen', 'name en', 'client name en',
  'client name', 'customer name', 'buyer name', 'seller name', 'full name',
  'lead name', 'contact name', 'buyer', 'seller', 'owner', 'name'
];

export const UNIT_TERMS = [
  'propertynumber', 'propertyno', 'property',
  'unitnumber', 'unitno', 'unit',
  'flatnumber', 'flatno', 'flat',
  'villanumber', 'villano', 'villa',
  'apartmentnumber', 'apartmentno', 'aptno', 'apt',
  'suiteno', 'suite', 'doorno', 'premiseno', 'premisesno',
  'plotpreregno', 'plotprereg', 'plotno', 'plotnumber', 'plot',
  'buildingno', 'buildingnumber'
];

export function cleanTxt(txt) {
  if (txt === null || txt === undefined) return '';
  let t = String(txt).trim();
  // Normalize Arabic numerals to standard Latin digits (0-9)
  t = t.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
  if (DUMMY_STRINGS.has(t.toLowerCase())) return '';
  return t;
}

// ─── 1. BULLETPROOF PHONE NORMALIZER ───
export function cleanPhone(raw) {
  if (!raw) return { valid: false, reason: 'Empty phone number' };
  let str = String(raw).trim();

  // Convert Arabic-Indic numerals
  str = str.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());

  // Fast reject obvious non-phone junk
  if (/[a-z]/i.test(str) && !/(?:ext|tel|mob|phone)/i.test(str)) {
    return { valid: false, reason: 'Contains alphabetic characters' };
  }
  if (str.includes(':') || (str.split('-').length > 3 && str.includes('00:00'))) {
    return { valid: false, reason: 'Timestamp or date detected in phone column' };
  }

  // Normalize vendor delimiters (+971|, 971/, 00971|, etc.)
  str = str.replace(/^(?:\+?00971|\+?971|00971)[\s|/\\-]+0?/gi, '971');
  
  // Fix +97104... and +97105... (redundant 0 after country code)
  str = str.replace(/^\+?9710([2-9])/g, '971$1');

  // Normalize local 0xx prefix with separators (050-..., 04-...)
  str = str.replace(/^0([2-9])[\s|/\\-]+/g, '0$1');

  // Split multiple phone numbers in one cell
  const parts = str.split(/[,;\n\r/|&]+/).map(p => p.trim()).filter(Boolean);
  let primaryRaw = parts[0] || '';
  const secondaryRaw = parts[1] || null;

  let primary = primaryRaw.replace(/\D/g, '');

  // Strip international prefixes (00)
  if (primary.startsWith('00')) {
    primary = primary.slice(2);
  }

  // Redundant 0 after 971: e.g. 9710552222519 -> 971552222519, 971043211442 -> 97143211442
  if (primary.startsWith('9710') && primary.length === 13) {
    primary = '971' + primary.slice(4);
  }

  // UAE local mobile normalization (05x -> 9715x, 5x -> 9715x)
  if (primary.startsWith('05') && primary.length === 10) {
    primary = '971' + primary.slice(1);
  } else if (primary.startsWith('5') && primary.length === 9) {
    primary = '971' + primary;
  }

  // UAE local landline normalization (04xxxxxxx -> 9714xxxxxxx, 02 -> 9712, etc.)
  if (/^0[234679]\d{7}$/.test(primary)) {
    primary = '971' + primary.slice(1);
  }

  // UAE Landline Detection
  const isUaeLandline = /^971[234679]\d{7}$/.test(primary);

  if (isUaeLandline) {
    return {
      valid: false,
      primary,
      vapi_e164: `+${primary}`,
      secondary: secondaryRaw ? cleanSecondaryPhone(secondaryRaw) : null,
      is_landline: true,
      reason: 'UAE Landline (Cannot receive outbound Voice AI call)',
    };
  }

  if (primary.length < 7) return { valid: false, reason: 'Too few digits (< 7)' };
  if (primary.length > 15) return { valid: false, reason: 'Too many digits (> 15)' };
  if (/^0+$/.test(primary)) return { valid: false, reason: 'Invalid all zeros' };

  return {
    valid: true,
    primary,
    vapi_e164: `+${primary}`,
    secondary: secondaryRaw ? cleanSecondaryPhone(secondaryRaw) : null,
    is_landline: false,
  };
}

function cleanSecondaryPhone(rawSec) {
  if (!rawSec) return null;
  let digits = String(rawSec).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString()).replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('9710') && digits.length === 13) digits = '971' + digits.slice(4);
  if (digits.startsWith('05') && digits.length === 10) digits = '971' + digits.slice(1);
  else if (digits.startsWith('5') && digits.length === 9) digits = '971' + digits;
  if (/^0[234679]\d{7}$/.test(digits)) digits = '971' + digits.slice(1);
  if (digits.length >= 7 && digits.length <= 15 && !/^0+$/.test(digits)) {
    return `+${digits}`;
  }
  return null;
}

// ─── 2. BULLETPROOF OWNER NAME SANITIZER ───
export function cleanOwnerName(raw) {
  if (!raw) return 'Property Owner';
  let name = String(raw).trim();

  // Strip non-name content (emails, phones, plot numbers, dummy strings)
  if (name.includes('@') && /\.[a-z]{2,}/i.test(name)) return 'Property Owner';
  if (/^\+?\d{6,}$/.test(name.replace(/[\s\-_]/g, ''))) return 'Property Owner';
  if (DUMMY_STRINGS.has(name.toLowerCase())) return 'Property Owner';

  // Strip vendor reference codes (e.g. "NR/NHO,", "REF-", "ID:")
  name = name.replace(/^(?:NR\/NHO|REF|ID|CODE)[\s,:\-_]+/gi, '');

  // Strip attached tower/unit suffixes (e.g. "-Kempinski C12", "-Tower B")
  name = name.replace(/-(?:Kempinski|Tower|Building|Villa|Flat|Unit|TH)[\s\w]*$/gi, '');

  // Normalize corporate suffixes (e.g. "( L L C", "L L C", "L.L.C.")
  name = name.replace(/\bL\s+L\s+C\b/gi, 'LLC');
  name = name.replace(/\bL\.L\.C\.?\b/gi, 'LLC');
  name = name.replace(/\bP\.J\.S\.C\.?\b/gi, 'P.J.S.C');

  // Strip noise symbols (backslashes, brackets, weird slashes, unclosed parens)
  name = name.replace(/[\\/\[\]{}()_]/g, ' ');

  // Clean floating hyphens (e.g. "United - LLC" -> "United LLC")
  name = name.replace(/\s+-\s+/g, ' ');

  // Strip leading and trailing punctuation (commas, hyphens, periods, colons, spaces)
  name = name.replace(/^[\s,.;:-]+|[\s,.;:-]+$/g, '');

  // Handle "LastName, FirstName" (e.g. "Al Zarooni, Mohammed" -> "Mohammed Al Zarooni")
  if (name.includes(',')) {
    const parts = name.split(',').map(p => p.trim()).filter(Boolean);
    const upper = name.toUpperCase();
    const hasCorp = Array.from(ACRONYMS_UPPERCASE).some(s => upper.includes(s)) ||
      /(\bLLC\b|\bLIMITED\b|\bLTD\b|\bPROPERTIES\b|\bDEVELOPMENT\b|\bHOLDING\b)/i.test(name);
    
    // Only reverse if 2 parts and NOT a corporate entity
    if (parts.length === 2 && !hasCorp && !upper.includes('&') && !upper.includes(' AND ')) {
      name = `${parts[1]} ${parts[0]}`;
    } else {
      name = parts.join(' ');
    }
  }

  // Handle semicolons in joint names (e.g. "Chelluri; Pavan & Chelluri V R Murthy" -> "Chelluri Pavan & Chelluri V R Murthy")
  name = name.replace(/;/g, ' ');

  // Collapse spaces
  name = name.replace(/\s+/g, ' ').trim();
  if (!name || DUMMY_STRINGS.has(name.toLowerCase())) return 'Property Owner';

  // Title Case, preserving recognized corporate acronyms in uppercase
  const words = name.split(' ');
  const formatted = words.map((w) => {
    const cleanWord = w.replace(/[^a-zA-Z.]/g, '');
    const upperWord = cleanWord.toUpperCase();
    if (ACRONYMS_UPPERCASE.has(upperWord)) {
      return upperWord === 'PJSC' ? 'P.J.S.C' : upperWord;
    }
    // Handle Arabic compound particles: Al, Bin, Bint, Abu, Ibn
    const lowerWord = w.toLowerCase();
    if (['al', 'el'].includes(lowerWord)) return 'Al';
    if (['bin', 'ibn'].includes(lowerWord)) return 'Bin';
    if (['bint'].includes(lowerWord)) return 'Bint';
    if (['abu'].includes(lowerWord)) return 'Abu';

    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  });

  return formatted.join(' ') || 'Property Owner';
}

// ─── 3. BULLETPROOF UNIT NUMBER EXTRACTOR ───
export function cleanUnitNumber(rawUnit, buildingName = '') {
  if (!rawUnit) return '';
  let u = String(rawUnit).trim();

  // Strip trailing dashes, slashes, whitespace
  u = u.replace(/[\s\-_/]+$/g, '').trim();

  // Strip DOB date strings (e.g. 1985-04-12, 12/04/1985) ingested mistakenly into unit field
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(u) || /^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(u)) {
    return '';
  }

  // Strip dummy or nullish placeholder strings
  if (DUMMY_STRINGS.has(u.toLowerCase()) || /^(?:null|none|n\/a|undefined|-|--|0)$/i.test(u)) {
    return '';
  }

  // Strip leading prefixes like "Unit ", "Flat ", "Villa ", "Apartment "
  u = u.replace(/^(?:Unit|Flat|Villa|Apartment|Apt|Suite|Door)\s+/i, '');

  // Handle DEWA Premise strings (e.g. "BB | DXB | NA | BBET TOWER M 1208", "PJC | DXB | Apartment 229 | Kempinski Apartment 229")
  if (u.includes('|')) {
    const segments = u.split('|').map(s => s.trim()).filter(Boolean);
    const aptSeg = segments.find(s => /^(?:Apartment|Flat|Unit|Villa|TH)\s+\d+/i.test(s));
    if (aptSeg) {
      return aptSeg.replace(/^(?:Apartment|Flat|Unit|Villa|TH)\s+/i, '').trim();
    }
    return segments[segments.length - 1] || u;
  }

  // If unit starts with the building name or community code, extract the specific unit suffix
  // e.g. Building: "TS HYT TH-V-367", Unit: "TS HYT TH-V-367-"
  if (buildingName && buildingName.length > 3) {
    const bUpper = buildingName.trim().toUpperCase();
    if (u.toUpperCase().startsWith(bUpper)) {
      const stripped = u.slice(bUpper.length).replace(/^[\s\-_/]+/, '').trim();
      if (stripped.length > 0) return stripped;
    }
    const m = u.match(/(TH-[\w-]+|V-[\w-]+|PH-[\w-]+|APT-[\w-]+|\b[A-Z0-9]+-[A-Z0-9]+)$/i);
    if (m) {
      return m[1];
    }
  }

  return u;
}

// ─── 4. BULLETPROOF EMAIL CLEANER ───
export function cleanEmail(raw) {
  if (!raw) return { primary: null, secondary: null };
  const str = String(raw).trim();
  if (DUMMY_STRINGS.has(str.toLowerCase())) return { primary: null, secondary: null };

  const parts = str.split(/[,;\s]+/).map(p => p.trim()).filter(p => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p));
  return {
    primary: parts[0] ? parts[0].toLowerCase() : null,
    secondary: parts[1] ? parts[1].toLowerCase() : null
  };
}

// ─── 5. COLUMN AUTO-DETECTOR (10 ROWS DATA-DRIVEN SCORING) ───
export function detectColumns(headers, sampleRows = []) {
  const lowerHeaders = headers.map(h => (h || '').toLowerCase().trim().replace(/[^a-z0-9]/g, ''));
  const colMap = {};
  const mappingUsed = {};

  // 1. Detect Name Column (Strict ranking with negative keyword protection and data verification)
  const nameCandidates = [];
  headers.forEach((h, idx) => {
    if (!h) return;
    const clean = lowerHeaders[idx];
    if (NEGATIVE_NAME_TERMS.some(neg => clean.includes(neg))) return;

    let score = 0;
    const strippedTier1 = NAME_TIER_1.map(t => t.replace(/[^a-z0-9]/g, ''));
    if (strippedTier1.includes(clean)) {
      score = (clean === 'ownername' || clean === 'nameen') ? 140 : 100;
    } else if (clean.includes('owner') || clean.includes('client') || clean.includes('customer')) {
      score = 80;
    } else if (clean.endsWith('name') || clean.includes('name') || clean === 'table1') {
      score = 60;
    }

    if (score > 0) {
      let dataBonus = 0;
      for (const r of sampleRows.slice(0, 10)) {
        const val = cleanTxt(r[idx]);
        if (val && /[a-zA-Z]/.test(val) && val.length > 2 && !DUMMY_STRINGS.has(val.toLowerCase()) && !val.includes('@')) {
          dataBonus += 15;
        }
      }
      nameCandidates.push({ idx, header: h.trim(), score: score + dataBonus });
    }
  });
  nameCandidates.sort((a, b) => b.score - a.score);
  if (nameCandidates.length > 0) {
    colMap['name'] = nameCandidates[0].idx;
    mappingUsed['NAME'] = nameCandidates[0].header;
    mappingUsed['name'] = nameCandidates[0].header;
  }

  // 2. Detect Phone Column
  const phoneCandidates = [];
  headers.forEach((h, idx) => {
    if (!h) return;
    const clean = lowerHeaders[idx];
    let score = 0;
    if (['mobile', 'mobile1', 'phone', 'phone1', 'contactnumber', 'mobilenumber', 'contact'].includes(clean)) {
      score = 100;
    } else if (['mobile2', 'phone2', 'secondarymobile', 'tel', 'whatsapp', 'cell', 'unnamed2', 'unnamed3'].includes(clean)) {
      score = 70;
    } else if (clean.includes('mobile') || clean.includes('phone') || clean.includes('contact') || clean.includes('number')) {
      score = 50;
    }

    if (score > 0) {
      let dataBonus = 0;
      for (const r of sampleRows.slice(0, 10)) {
        const val = cleanTxt(r[idx]);
        if (val && /\d{7,}/.test(val.replace(/\D/g, '')) && !DUMMY_STRINGS.has(val.toLowerCase())) {
          dataBonus += 15;
        }
      }
      phoneCandidates.push({ idx, header: h.trim(), score: score + dataBonus });
    }
  });
  phoneCandidates.sort((a, b) => b.score - a.score);
  if (phoneCandidates.length > 0) {
    colMap['phone'] = phoneCandidates[0].idx;
    mappingUsed['PHONE'] = phoneCandidates[0].header;
    mappingUsed['phone'] = phoneCandidates[0].header;
  }

  // 3. Detect Unit Column
  const unitCandidates = [];
  headers.forEach((h, idx) => {
    if (!h) return;
    const clean = lowerHeaders[idx];
    if (['propertytype', 'propertyusage', 'transaction', 'amount', 'size', 'plotsize', 'builtup', 'date', 'price', 'value', 'fee', 'status', 'bed', 'beds'].some(neg => clean.includes(neg))) {
      return;
    }

    let score = 0;
    if (['propertynumber', 'propertyno', 'unitnumber', 'unitno', 'flatno', 'villano', 'plotpreregno', 'plotno', 'plotnumber', 'buildingno', 'buildingnumber'].includes(clean)) {
      score = 100;
    } else if (clean.includes('propertynumber') || clean.includes('unitnumber') || clean.includes('propertyno') || clean.includes('unitno') || clean.includes('plotprereg') || clean.includes('buildingno')) {
      score = 90;
    } else if (['unit', 'flat', 'villa', 'property', 'plot'].includes(clean)) {
      score = 70;
    } else if (UNIT_TERMS.some(t => clean.includes(t)) || clean.includes('unit') || clean.includes('flat') || clean.includes('villa') || clean.includes('suite') || clean.includes('door') || clean.includes('plot') || clean === 'unnamed5') {
      score = 50;
    }

    if (score > 0) {
      let dataBonus = 0;
      for (const r of sampleRows.slice(0, 10)) {
        const val = cleanTxt(r[idx]);
        if (val && !DUMMY_STRINGS.has(val.toLowerCase())) {
          dataBonus += 15;
        }
      }
      unitCandidates.push({ idx, header: h.trim(), score: score + dataBonus });
    }
  });
  unitCandidates.sort((a, b) => b.score - a.score);
  if (unitCandidates.length > 0) {
    colMap['unit'] = unitCandidates[0].idx;
    mappingUsed['UNIT'] = unitCandidates[0].header;
    mappingUsed['unit'] = unitCandidates[0].header;
  }

  // 4. Detect Project Column
  const projectTerms = ['masterproject', 'project', 'projectname', 'mastercommunity', 'development', 'community', 'buildingnameen', 'buildingname', 'building1', 'building', 'tower'];
  for (const pTerm of projectTerms) {
    const idx = lowerHeaders.findIndex(h => h === pTerm);
    if (idx !== -1 && colMap['project'] === undefined) {
      colMap['project'] = idx;
      mappingUsed['PROJECT'] = headers[idx].trim();
      mappingUsed['project'] = headers[idx].trim();
      break;
    }
  }

  // 5. Detect Property Type
  const propTerms = ['propertytypeen', 'propertytype', 'unittype', 'subtype', 'usage', 'type'];
  for (const ptTerm of propTerms) {
    const idx = lowerHeaders.findIndex(h => h === ptTerm);
    if (idx !== -1 && colMap['property_type'] === undefined) {
      colMap['property_type'] = idx;
      mappingUsed['PROPERTY_TYPE'] = headers[idx].trim();
      mappingUsed['property_type'] = headers[idx].trim();
      break;
    }
  }

  // 6. Detect Location
  const locTerms = ['masterlocation', 'location', 'area', 'subcommunity', 'district', 'city'];
  for (const lTerm of locTerms) {
    const idx = lowerHeaders.findIndex(h => h === lTerm);
    if (idx !== -1 && colMap['location'] === undefined) {
      colMap['location'] = idx;
      mappingUsed['LOCATION'] = headers[idx].trim();
      mappingUsed['location'] = headers[idx].trim();
      break;
    }
  }

  return { colMap, mappingUsed };
}

// ─── 6. PROCESS LEADS CLIENT-SIDE ───
export async function processLeadsClientSide(matrix, defaultPropType = 'Apartment', filename = 'file.xlsx') {
  if (!matrix || matrix.length < 2) {
    throw new Error('Spreadsheet has no data rows.');
  }

  const rawHeaders = matrix[0].map(h => (h !== null && h !== undefined ? String(h).trim() : ''));
  const dataRows = matrix.slice(1);
  const sampleRows = dataRows.slice(0, 10);

  const { colMap, mappingUsed } = detectColumns(rawHeaders, sampleRows);
  const lowerHeaders = rawHeaders.map(h => (h || '').toLowerCase().trim().replace(/[^a-z0-9]/g, ''));

  // Collect candidate fallback indices across all columns
  const allPhoneIndices = [];
  const allNameIndices = [];
  const allUnitIndices = [];
  const allProjectIndices = [];
  const allLocationIndices = [];

  rawHeaders.forEach((h, idx) => {
    const hl = lowerHeaders[idx];
    if (['mobile', 'mobile1', 'mobile2', 'phone', 'phone1', 'phone2', 'secondarymobile', 'contact', 'tel', 'whatsapp', 'number', 'unnamed2'].some(t => hl.includes(t))) {
      allPhoneIndices.push(idx);
    }
    if (!NEGATIVE_NAME_TERMS.some(neg => hl.includes(neg)) && (NAME_TIER_1.some(t => hl.includes(t.replace(/[^a-z0-9]/g, ''))) || hl.includes('name') || hl.includes('table1'))) {
      allNameIndices.push(idx);
    }
    if (!['propertytype', 'transaction', 'amount', 'size', 'plotsize', 'builtup', 'date', 'price', 'status', 'bed', 'beds'].some(neg => hl.includes(neg))) {
      if (UNIT_TERMS.some(t => hl.includes(t)) || hl.includes('unit') || hl.includes('villa') || hl.includes('property') || hl.includes('flat')) {
        allUnitIndices.push(idx);
      }
    }
    if (hl.includes('project') || hl.includes('building') || hl.includes('community')) {
      allProjectIndices.push(idx);
    }
    if (hl.includes('location') || hl.includes('area') || hl.includes('city')) {
      allLocationIndices.push(idx);
    }
  });

  const cleanCandidates = [];
  const invalidLeads = [];
  const seenPhones = new Set();
  const duplicatesInFile = [];
  let landlineCount = 0;

  dataRows.forEach((row, rowIdx) => {
    const rowNum = rowIdx + 2;

    // 1. Phone extraction
    let rawPhone = colMap.phone !== undefined ? row[colMap.phone] || '' : '';
    if (!cleanTxt(rawPhone)) {
      for (const pIdx of allPhoneIndices) {
        if (cleanTxt(row[pIdx])) {
          rawPhone = row[pIdx];
          break;
        }
      }
    }

    // 2. Name extraction
    let rawName = colMap.name !== undefined ? row[colMap.name] || '' : '';
    if (!cleanTxt(rawName)) {
      for (const nIdx of allNameIndices) {
        const cand = cleanTxt(row[nIdx]);
        if (cand && !NEGATIVE_NAME_TERMS.some(neg => cand.toLowerCase().includes(neg))) {
          rawName = cand;
          break;
        }
      }
    }

    // 3. Project extraction
    let rawProject = colMap.project !== undefined ? cleanTxt(row[colMap.project]) : '';
    if (!rawProject) {
      for (const prIdx of allProjectIndices) {
        const cand = cleanTxt(row[prIdx]);
        if (cand) { rawProject = cand; break; }
      }
    }

    // 4. Unit extraction with building context
    let rawUnit = colMap.unit !== undefined ? cleanTxt(row[colMap.unit]) : '';
    if (!rawUnit || DUMMY_STRINGS.has(rawUnit.toLowerCase())) {
      for (const uIdx of allUnitIndices) {
        const cand = cleanTxt(row[uIdx]);
        if (cand && !DUMMY_STRINGS.has(cand.toLowerCase())) {
          rawUnit = cand;
          break;
        }
      }
    }

    // 5. Location extraction
    let rawLocation = colMap.location !== undefined ? cleanTxt(row[colMap.location]) : '';
    if (!rawLocation) {
      for (const lIdx of allLocationIndices) {
        const cand = cleanTxt(row[lIdx]);
        if (cand) { rawLocation = cand; break; }
      }
    }

    const rawPropType = colMap.property_type !== undefined ? cleanTxt(row[colMap.property_type]) : '';

    // Apply enterprise sanitizers
    const phoneRes = cleanPhone(rawPhone);
    const cleanName = cleanOwnerName(rawName);
    const cleanUnit = cleanUnitNumber(rawUnit, rawProject);

    // Build Lead Item (100% of original columns preserved)
    const item = {
      row_num: rowNum,
      vapi_e164: phoneRes.vapi_e164,
      secondary_phone: phoneRes.secondary,
      source_file: filename,
    };

    rawHeaders.forEach((h, idx) => {
      item[h] = row[idx] !== undefined && row[idx] !== null ? row[idx] : '';
    });

    item.owner_name = cleanName;
    item.contact_number = phoneRes.primary || rawPhone;
    item.unit_number = cleanUnit || '';
    item.project_name = rawProject || '';
    item.location = rawLocation || '';
    item.property_type = rawPropType || defaultPropType;

    item['Owner Name'] = cleanName;
    item['Contact Number'] = phoneRes.primary || rawPhone;
    item['Unit Number'] = cleanUnit || '';
    item['Project'] = rawProject || '';
    item['Location'] = rawLocation || '';
    item['Property Type'] = rawPropType || defaultPropType;
    item['Cleaned Unit Number'] = cleanUnit || '';
    item['Cleaned Phone (E.164)'] = phoneRes.vapi_e164 || (phoneRes.primary ? `+${phoneRes.primary}` : '');

    if (!phoneRes.valid) {
      if (phoneRes.is_landline) {
        landlineCount++;
      }
      item.status = 'rejected';
      item.reason = phoneRes.reason;
      invalidLeads.push(item);
      return;
    }

    if (seenPhones.has(phoneRes.primary)) {
      item.status = 'duplicate_file';
      item.reason = 'Duplicate within uploaded file (repeated phone number)';
      duplicatesInFile.push(item);
      return;
    }

    seenPhones.add(phoneRes.primary);
    item.status = 'ready';
    cleanCandidates.push(item);
  });

  // Check CRM duplicates in Supabase
  let duplicatesInDb = [];
  let readyLeads = [];

  try {
    const phonesToCheck = cleanCandidates.map(c => c.contact_number).filter(Boolean);
    const matchedPhones = new Set();
    const BATCH_SIZE = 50;

    for (let i = 0; i < Math.min(phonesToCheck.length, 500); i += BATCH_SIZE) {
      const chunk = phonesToCheck.slice(i, i + BATCH_SIZE);
      const res = await axios.get(
        `${SUPABASE_URL}/rest/v1/owners_data?select=phone_normalized&phone_normalized=in.(${encodeURIComponent(chunk.join(','))})&limit=100`,
        { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
      );
      if (res.data && Array.isArray(res.data)) {
        res.data.forEach(r => {
          if (r.phone_normalized) matchedPhones.add(r.phone_normalized);
        });
      }
    }

    cleanCandidates.forEach(cand => {
      if (matchedPhones.has(cand.contact_number)) {
        cand.status = 'duplicate_db';
        cand.reason = 'Lead already present in CRM database';
        duplicatesInDb.push(cand);
      } else {
        readyLeads.push(cand);
      }
    });
  } catch (e) {
    console.warn('CRM duplicate check warning:', e.message);
    readyLeads = cleanCandidates;
  }

  return {
    filename,
    headers: rawHeaders,
    original_headers: rawHeaders,
    total_columns: rawHeaders.length,
    mapping_used: mappingUsed,
    stats: {
      total: dataRows.length,
      ready: readyLeads.length,
      duplicates_file: duplicatesInFile.length,
      duplicates_db: duplicatesInDb.length,
      invalid: invalidLeads.length,
      landlines: landlineCount,
    },
    clean_leads: readyLeads,
    duplicates_in_file: duplicatesInFile,
    duplicates_in_db: duplicatesInDb,
    invalid_leads: invalidLeads,
  };
}

// ─── 7. EXPORT CLEANED CSV ───
export function generateCleanCSV(leads, originalHeaders = null) {
  if (!leads || leads.length === 0) return '';

  let baseHeaders = originalHeaders;
  if (!baseHeaders || baseHeaders.length === 0) {
    const sample = leads[0] || {};
    const internal = new Set([
      'row_num', 'vapi_e164', 'secondary_phone', 'source_file', 'status', 'reason',
      'owner_name', 'contact_number', 'unit_number', 'project_name', 'location', 'property_type',
      'Cleaned Unit Number', 'Cleaned Phone (E.164)'
    ]);
    baseHeaders = Object.keys(sample).filter(k => !internal.has(k));
  }

  const exportHeaders = [...baseHeaders];
  if (!exportHeaders.includes('Cleaned Owner Name')) exportHeaders.push('Cleaned Owner Name');
  if (!exportHeaders.includes('Cleaned Phone (E.164)')) exportHeaders.push('Cleaned Phone (E.164)');
  if (!exportHeaders.includes('Cleaned Unit Number')) exportHeaders.push('Cleaned Unit Number');
  if (!exportHeaders.includes('Cleaning Status')) exportHeaders.push('Cleaning Status');
  if (!exportHeaders.includes('Validation Reason')) exportHeaders.push('Validation Reason');

  const rows = [exportHeaders.map(h => `"${String(h).replace(/"/g, '""')}"`).join(',')];

  leads.forEach(l => {
    const row = exportHeaders.map(h => {
      let val = '';
      if (h === 'Cleaned Owner Name') val = l.owner_name || l['Owner Name'] || '';
      else if (h === 'Cleaned Phone (E.164)') val = l.vapi_e164 || (l.contact_number ? '+' + l.contact_number : '');
      else if (h === 'Cleaned Unit Number') val = l.unit_number || l['Unit Number'] || '';
      else if (h === 'Cleaning Status') val = l.status === 'ready' ? 'Clean & Valid' : (l.status || '');
      else if (h === 'Validation Reason') val = l.reason || '';
      else if (l[h] !== undefined && l[h] !== null) val = l[h];
      return `"${String(val).replace(/"/g, '""')}"`;
    });
    rows.push(row.join(','));
  });

  return rows.join('\r\n');
}
