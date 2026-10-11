import axios from 'axios';

const SUPABASE_URL = 'https://qgxgtavkovqklijfpnfl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneGd0YXZrb3Zxa2xpamZwbmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjA1MzksImV4cCI6MjA5MzYzNjUzOX0.hbxMBy0qm8Q3WVQTE8218JhtGtdNm7a9rYCUisTRb08';

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

export function cleanTxt(txt) {
  if (txt === null || txt === undefined) return '';
  let t = String(txt).trim();
  const DUMMY_STRINGS = ['null', 'n/a', 'na', 'none', '-', '0', 'undefined', 'nil', 'unknown', '.', 'n.a', 'not available'];
  if (DUMMY_STRINGS.includes(t.toLowerCase())) return '';
  return t;
}

export function cleanPhone(raw) {
  if (!raw) return { valid: false, reason: 'Missing phone' };
  let str = String(raw).trim();

  // Handle UAE prefix with pipe or slash delimiters: 971|50-4336247 -> 971504336247
  str = str.replace(/^(?:\+?971|00971)[\s|/\\-]+/g, '971');

  // Split multiple phone delimiters
  const parts = str.split(/[,;\n\r/]+/).map(p => p.trim()).filter(Boolean);
  let primary = (parts[0] || '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString()).replace(/\D/g, '');
  const secondary = parts[1] ? parts[1].replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString()).replace(/\D/g, '') : null;

  if (primary.length < 7) return { valid: false, reason: 'Too few digits (< 7)' };
  if (primary.length > 15) return { valid: false, reason: 'Too many digits (> 15)' };
  if (/^0+$/.test(primary)) return { valid: false, reason: 'Invalid all zeros' };

  if (primary.startsWith('00')) {
    primary = primary.slice(2);
  }

  // UAE Local Mobile Normalization (05x -> 9715x, 5x -> 9715x)
  if (primary.startsWith('05') && primary.length === 10) {
    primary = '971' + primary.slice(1);
  } else if (primary.startsWith('5') && primary.length === 9) {
    primary = '971' + primary;
  }

  // UAE Landline Detection
  const isUaeLandline = 
    primary.startsWith('9714') || 
    primary.startsWith('9712') || 
    primary.startsWith('9716') || 
    primary.startsWith('9717') || 
    primary.startsWith('9719') ||
    ((primary.startsWith('04') || primary.startsWith('02') || primary.startsWith('06') || primary.startsWith('07') || primary.startsWith('09')) && primary.length === 9);

  if (isUaeLandline) {
    return {
      valid: false,
      primary,
      vapi_e164: `+${primary.startsWith('0') ? '971' + primary.slice(1) : primary}`,
      secondary,
      is_landline: true,
      reason: 'UAE Landline (Cannot receive voice AI outbound call)',
    };
  }

  if (primary.startsWith('0') && primary.length > 10) {
    primary = primary.slice(1);
  }

  return {
    valid: true,
    primary,
    vapi_e164: `+${primary}`,
    secondary,
    is_landline: false,
  };
}

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
    } else if (clean.endsWith('name') || clean.includes('name')) {
      score = 60;
    }

    if (score > 0) {
      let dataBonus = 0;
      for (const r of sampleRows) {
        const val = cleanTxt(r[idx]);
        if (val && /[a-zA-Z]/.test(val) && val.length > 2) {
          dataBonus += 10;
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
    } else if (['mobile2', 'phone2', 'secondarymobile', 'tel', 'whatsapp', 'cell'].includes(clean)) {
      score = 70;
    } else if (clean.includes('mobile') || clean.includes('phone') || clean.includes('contact')) {
      score = 50;
    }

    if (score > 0) {
      let dataBonus = 0;
      for (const r of sampleRows) {
        const val = cleanTxt(r[idx]);
        if (val && /\d{6,}/.test(val.replace(/\D/g, ''))) {
          dataBonus += 10;
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

  // 3. Project
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

  // 4. Unit
  const unitTerms = ['unitnumber', 'unitno', 'unit', 'flat', 'flatno', 'villano', 'apt', 'apartmentno', 'suite'];
  for (const uTerm of unitTerms) {
    const idx = lowerHeaders.findIndex(h => h === uTerm);
    if (idx !== -1 && colMap['unit'] === undefined) {
      colMap['unit'] = idx;
      mappingUsed['UNIT'] = headers[idx].trim();
      mappingUsed['unit'] = headers[idx].trim();
      break;
    }
  }

  // 5. Property Type
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

  // 6. Location
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

  const aiMapping = headers.map((h, idx) => {
    let standardRole = null;
    let normalizedHeader = (h || '').trim() || `Column ${idx + 1}`;
    
    if (colMap['name'] === idx) { standardRole = 'name'; normalizedHeader = 'Owner Name'; }
    else if (colMap['phone'] === idx) { standardRole = 'phone'; normalizedHeader = 'Contact Number'; }
    else if (colMap['project'] === idx) { standardRole = 'project'; normalizedHeader = 'Project'; }
    else if (colMap['location'] === idx) { standardRole = 'location'; normalizedHeader = 'Location'; }
    else if (colMap['unit'] === idx) { standardRole = 'unit'; normalizedHeader = 'Unit Number'; }
    else if (colMap['property_type'] === idx) { standardRole = 'property_type'; normalizedHeader = 'Property Type'; }

    return {
      originalIndex: idx,
      rawHeader: h || `Column ${idx + 1}`,
      normalizedHeader,
      standardRole,
    };
  });

  return { colMap, mappingUsed, aiMapping };
}

export async function processLeadsClientSide(matrix, defaultPropType = 'Apartment', filename = 'file.xlsx') {
  if (!matrix || matrix.length < 2) {
    throw new Error('Spreadsheet has no data rows.');
  }

  const headers = matrix[0];
  const dataRows = matrix.slice(1);
  const sampleRows = dataRows.slice(0, 15);

  const { colMap, mappingUsed, aiMapping } = detectColumns(headers, sampleRows);

  // Alternative fallback indices
  const allPhoneIndices = [];
  const allNameIndices = [];
  headers.forEach((h, idx) => {
    const hl = (h || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (['mobile', 'mobile1', 'mobile2', 'phone', 'phone1', 'phone2', 'secondarymobile', 'contact', 'tel', 'whatsapp'].some(t => hl.includes(t))) {
      allPhoneIndices.push(idx);
    }
    if (!NEGATIVE_NAME_TERMS.some(neg => hl.includes(neg)) && NAME_TIER_1.some(t => hl.includes(t.replace(/[^a-z0-9]/g, '')))) {
      allNameIndices.push(idx);
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

    // 2. Name extraction with multi-column fallback
    let rawName = colMap.name !== undefined ? row[colMap.name] || '' : '';
    if (!cleanTxt(rawName)) {
      for (const nIdx of allNameIndices) {
        if (cleanTxt(row[nIdx])) {
          rawName = row[nIdx];
          break;
        }
      }
    }

    const phoneRes = cleanPhone(rawPhone);
    const rawNameClean = cleanTxt(rawName);
    const cleanName = rawNameClean ? rawNameClean.replace(/\b\w/g, c => c.toUpperCase()) : 'Property Owner';

    const item = {
      row_num: rowNum,
      vapi_e164: phoneRes.vapi_e164,
      secondary_phone: phoneRes.secondary,
      source_file: filename,
    };

    aiMapping.forEach(m => {
      const val = row[m.originalIndex] !== undefined ? row[m.originalIndex] : '';
      if (m.standardRole === 'phone') {
        item[m.normalizedHeader] = phoneRes.primary || rawPhone || 'N/A';
      } else if (m.standardRole === 'name') {
        item[m.normalizedHeader] = cleanName;
      } else if (m.standardRole === 'property_type') {
        item[m.normalizedHeader] = cleanTxt(val) || defaultPropType;
      } else {
        item[m.normalizedHeader] = cleanTxt(val) || val;
      }
    });

    item.contact_number = phoneRes.primary || rawPhone;
    item.owner_name = cleanName;
    item['Owner Name'] = cleanName;
    item['Contact Number'] = phoneRes.primary || rawPhone;

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
      const queryList = chunk.map(p => `"${p}"`).join(',');
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

  const finalHeaders = aiMapping.map(m => m.normalizedHeader);

  return {
    headers: finalHeaders,
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
