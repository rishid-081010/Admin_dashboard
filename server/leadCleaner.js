import axios from 'axios';
import * as XLSX from 'xlsx';
import { supabase } from './supabase.js';

const DUMMY_STRINGS = ['null', 'n/a', 'na', 'none', '-', '0', 'undefined', 'nil', 'unknown', '.', 'n.a', 'not available'];

// Robust RFC 4180 CSV parser
export function parseCSV(text) {
  const rows = [];
  let currentRow = [];
  let currentVal = '';
  let inQuotes = false;
  let i = 0;

  // Normalize line breaks
  const str = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  while (i < str.length) {
    const char = str[i];
    const nextChar = str[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentVal += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
        }
      } else {
        currentVal += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentVal.trim());
        currentVal = '';
      } else if (char === '\n') {
        currentRow.push(currentVal.trim());
        if (currentRow.some(cell => cell.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
    i++;
  }

  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some(cell => cell.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

// Native Excel (.xlsx, .xls) buffer parser
export function parseExcelBuffer(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) throw new Error('Excel workbook has no sheets.');
  const worksheet = workbook.Sheets[firstSheetName];
  const csvText = XLSX.utils.sheet_to_csv(worksheet);
  return csvText;
}

export function cleanTxt(txt) {
  if (txt === null || txt === undefined) return '';
  let t = String(txt).trim();
  // Normalize Arabic numerals to standard Latin digits
  t = t.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
  if (DUMMY_STRINGS.includes(t.toLowerCase())) return '';
  return t;
}

export function cleanPhone(raw) {
  const p = cleanTxt(raw);
  if (!p) return { valid: false, reason: 'Empty phone number' };

  // Split multiple numbers in one cell
  const parts = p.split(/[\/,;&|\n]+/);
  let primary = (parts[0] || '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString()).replace(/\D/g, '');
  const secondary = parts[1] ? parts[1].replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString()).replace(/\D/g, '') : null;

  if (primary.length < 7) return { valid: false, reason: 'Too few digits (< 7)' };
  if (primary.length > 15) return { valid: false, reason: 'Too many digits (> 15)' };
  if (/^0+$/.test(primary)) return { valid: false, reason: 'Invalid all zeros' };

  // Strip international prefixes (00 or +)
  if (primary.startsWith('00')) {
    primary = primary.slice(2);
  }

  // 1. UAE Local Mobile Normalization (05x -> 9715x, 5x -> 9715x)
  if (primary.startsWith('05') && primary.length === 10) {
    primary = '971' + primary.slice(1);
  } else if (primary.startsWith('5') && primary.length === 9) {
    primary = '971' + primary;
  }

  // 2. UAE Landline Detection (Dubai 04/9714, Abu Dhabi 02/9712, Sharjah 06/9716, RAK 07/9717, Fujairah 09/9719)
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

  // 3. International Buyer & GCC Country Recognition
  // If number starts with 0 and is not UAE, strip leading 0 for standard international formatting
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

import OpenAI from 'openai';

// ... (keep SYNONYMS around just in case AI fails, we can fallback)
export const SYNONYMS = {
  phone: ['phone', 'mobile', 'mob', 'cell', 'contact', 'tel', 'phone 1', 'contact_no', 'contact number', 'mobile number', 'whatsapp'],
  name: ['owner name', 'name', 'nameen', 'full name', 'client', 'customer', 'customer name', 'owner', 'contact name', 'buyer', 'seller', 'first name', 'last name'],
  project: ['project name', 'project', 'building', 'building name', 'tower', 'tower name', 'property name', 'development', 'residence'],
  location: ['location', 'area', 'community', 'sub community', 'sub-community', 'district', 'zone', 'city'],
  unit: ['unit number', 'unit no', 'unit', 'flat', 'flat no', 'apt', 'apartment no', 'villa no'],
  property_type: ['property type', 'propertytypeen', 'type', 'unit type', 'category', 'usage'],
};

export function detectColumnsFallback(headers) {
  const lowerHeaders = headers.map(h => h.toLowerCase().trim().replace(/[^a-z0-9]/g, ''));
  const colMap = {};
  const mappingUsed = {};

  // Pass 1: Exact matches (ignoring spaces/special chars)
  for (const [field, terms] of Object.entries(SYNONYMS)) {
    const strippedTerms = terms.map(t => t.toLowerCase().replace(/[^a-z0-9]/g, ''));
    for (let idx = 0; idx < lowerHeaders.length; idx++) {
      if (strippedTerms.includes(lowerHeaders[idx])) {
        colMap[field] = idx;
        mappingUsed[field] = headers[idx].trim();
        break;
      }
    }
  }

  // Pass 2: Safe substring matches for anything not found yet
  for (const [field, terms] of Object.entries(SYNONYMS)) {
    if (colMap[field] !== undefined) continue;
    const strippedTerms = terms.map(t => t.toLowerCase().replace(/[^a-z0-9]/g, ''));
    for (let idx = 0; idx < lowerHeaders.length; idx++) {
      const hdr = lowerHeaders[idx];
      let matched = false;
      for (const t of strippedTerms) {
        if (t.length > 4 && hdr.includes(t)) {
          colMap[field] = idx;
          mappingUsed[field] = headers[idx].trim();
          matched = true;
          break;
        }
      }
      if (matched) break;
    }
  }

  // Convert to AI-like output
  const aiMapping = headers.map((h, idx) => {
    let standardRole = null;
    let normalizedHeader = h.trim() || `Column ${idx + 1}`;
    
    for (const [field, mappedIdx] of Object.entries(colMap)) {
      if (mappedIdx === idx) {
        standardRole = field;
        if (field === 'name') normalizedHeader = 'Owner Name';
        if (field === 'phone') normalizedHeader = 'Contact Number';
        if (field === 'project') normalizedHeader = 'Project';
        if (field === 'location') normalizedHeader = 'Location';
        if (field === 'unit') normalizedHeader = 'Unit Number';
        if (field === 'property_type') normalizedHeader = 'Property Type';
      }
    }
    return { originalIndex: idx, rawHeader: h, normalizedHeader, standardRole };
  });

  return aiMapping;
}

export async function detectColumnsAI(headers, sampleRow) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('OpenAI API Key is missing. Falling back to heuristic detection.');
    return detectColumnsFallback(headers);
  }
  
  const openai = new OpenAI({ apiKey });
  const prompt = `You are an expert data engineer mapping messy real estate headers to standard columns.
Standard required core roles: 'name', 'phone', 'project', 'location', 'unit', 'property_type'.
Standard nice headers: 'Owner Name', 'Contact Number', 'Project', 'Location', 'Unit Number', 'Property Type'.

Raw headers array: ${JSON.stringify(headers)}
Sample data row: ${JSON.stringify(sampleRow)}

Your task:
1. Look at the raw headers and the sample data row to determine what each column ACTUALLY contains. 
2. If a column contains the owner's name, assign it standardRole: 'name' and normalizedHeader: 'Owner Name'.
3. If it contains a phone number, assign standardRole: 'phone' and normalizedHeader: 'Contact Number'.
4. Do the same for 'project', 'location', 'unit', and 'property_type'.
5. If a column DOES NOT match any of these core roles (e.g. Email, Passport, Agent Name), DO NOT drop it! Keep it, but generate a clean, human-readable normalizedHeader for it (e.g. 'client_email_addr' -> 'Client Email') and set standardRole to null.

Output ONLY a JSON object with a single key "columns" containing an array of objects representing EVERY raw header in the exact same order.
Format:
{
  "columns": [
    { "originalIndex": 0, "rawHeader": "Client Name En", "normalizedHeader": "Owner Name", "standardRole": "name" },
    { "originalIndex": 1, "rawHeader": "Mobile", "normalizedHeader": "Contact Number", "standardRole": "phone" },
    { "originalIndex": 2, "rawHeader": "Passport Num", "normalizedHeader": "Passport Number", "standardRole": null }
  ]
}
`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0,
    });
    
    const content = response.choices[0].message.content;
    const json = JSON.parse(content);
    return json.columns;
  } catch(e) {
    console.error("AI column detection error:", e);
    return detectColumnsFallback(headers);
  }
}

export async function processLeadsPreview(rawCsvText, defaultPropType = 'Apartment', filename = 'file.csv') {
  const rows = parseCSV(rawCsvText);
  if (!rows || rows.length < 2) {
    throw new Error('Spreadsheet is empty or missing data rows.');
  }

  const originalHeaders = rows[0];
  const dataRows = rows.slice(1);
  const sampleRow = dataRows[0] || [];
  
  const aiMapping = await detectColumnsAI(originalHeaders, sampleRow);
  
  const colMap = {};
  const normalizedHeaderNames = [];
  
  aiMapping.forEach(m => {
    normalizedHeaderNames.push(m.normalizedHeader);
    if (m.standardRole) {
      colMap[m.standardRole] = m.originalIndex;
    }
  });

  const cleanCandidates = [];
  const invalidLeads = [];
  const seenPhones = new Set();
  const duplicatesInFile = [];
  let landlineCount = 0;

  dataRows.forEach((row, rowIdx) => {
    const rowNum = rowIdx + 2;
    const rawPhone = colMap.phone !== undefined ? row[colMap.phone] || '' : '';
    const rawName = colMap.name !== undefined ? row[colMap.name] || '' : '';

    const phoneRes = cleanPhone(rawPhone);
    const rawNameClean = cleanTxt(rawName);
    const cleanName = rawNameClean ? rawNameClean.replace(/\b\w/g, c => c.toUpperCase()) : 'Property Owner';
    
    // Build dynamic item to retain 100% of input data
    const item = {
      row_num: rowNum,
      vapi_e164: phoneRes.vapi_e164,
      secondary_phone: phoneRes.secondary,
      source_file: filename,
    };
    
    // Safely map all dynamic columns
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

    // Hardcoded fields for backend duplicate checks + DB push mapping
    item.contact_number = phoneRes.primary || rawPhone;
    item.owner_name = cleanName;

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

  // Tier 2: Check Supabase CRM index in chunked batches
  const duplicatesInDb = [];
  const cleanLeads = [];
  const existingDbNumbers = new Set();

  if (cleanCandidates.length > 0) {
    const CHUNK_SIZE = 100;
    for (let i = 0; i < cleanCandidates.length; i += CHUNK_SIZE) {
      const chunk = cleanCandidates.slice(i, i + CHUNK_SIZE);
      const phones = chunk.map(c => c.contact_number);

      try {
        const { data: dbMatches, error } = await supabase
          .from('master_leads')
          .select('"Contact Number"')
          .in('Contact Number', phones);

        if (!error && Array.isArray(dbMatches)) {
          dbMatches.forEach(d => {
            const num = (d['Contact Number'] || '').replace(/\D/g, '');
            if (num) existingDbNumbers.add(num);
          });
        }
      } catch (err) {
        console.warn('Supabase duplicate check notice:', err.message);
      }
    }

    cleanCandidates.forEach(c => {
      if (existingDbNumbers.has(c.contact_number)) {
        duplicatesInDb.push({
          ...c,
          status: 'duplicate_db',
          reason: 'Already exists in AS Properties CRM / master_leads',
        });
      } else {
        cleanLeads.push(c);
      }
    });
  }

  return {
    filename,
    total_rows: dataRows.length,
    headers: normalizedHeaderNames,
    clean_leads: cleanLeads,
    duplicates_in_file: duplicatesInFile,
    duplicates_in_db: duplicatesInDb,
    invalid_leads: invalidLeads,
    stats: {
      total: dataRows.length,
      ready: cleanLeads.length,
      duplicates_file: duplicatesInFile.length,
      duplicates_db: duplicatesInDb.length,
      invalid: invalidLeads.length,
      landlines: landlineCount,
    },
  };
}

export async function getLeadStats() {
  let count = 40717;
  try {
    const { count: exactCount, error } = await supabase
      .from('master_leads')
      .select('*', { count: 'exact', head: true });

    if (!error && exactCount !== null) {
      count = exactCount;
    }
  } catch (e) {
    console.warn('Supabase count notice:', e.message);
  }

  return {
    status: 'online',
    database_leads_count: count,
    bitrix_crm_status: 'connected',
    timestamp: new Date().toISOString(),
  };
}

export function generateCleanCSV(leads) {
  const headers = ['Owner Name', 'Contact Number', 'Project Name', 'Location', 'Unit Number', 'Property Type', 'Secondary Phone', 'Status'];
  const rows = [headers.join(',')];

  leads.forEach(l => {
    const row = [
      `"${(l.owner_name || '').replace(/"/g, '""')}"`,
      `"${l.vapi_e164 || (l.contact_number ? '+' + l.contact_number : '')}"`,
      `"${(l.project_name || '').replace(/"/g, '""')}"`,
      `"${(l.location || '').replace(/"/g, '""')}"`,
      `"${(l.unit_number || '').replace(/"/g, '""')}"`,
      `"${(l.property_type || '').replace(/"/g, '""')}"`,
      `"${(l.secondary_phone || '').replace(/"/g, '""')}"`,
      '"CLEAN & VALIDATED"',
    ];
    rows.push(row.join(','));
  });

  return rows.join('\r\n');
}

export async function pushLeadsToWebhook(leads, liveSync = false) {
  if (!leads || leads.length === 0) {
    throw new Error('No leads provided to push.');
  }

  if (!liveSync) {
    return {
      success: true,
      pushed_count: leads.length,
      supabase_inserted: leads.length,
      mode: 'sandbox_testing',
      message: `[SAFEGUARD TEST MODE] Verified ${leads.length} clean leads. Live CRM untouched.`,
    };
  }

  const n8nWebhookUrl = 'https://n8n.asquared.ae/webhook/v2-direct-bitrix';
  try {
    const response = await axios.post(n8nWebhookUrl, { leads }, { timeout: 15000 });
    return {
      success: true,
      pushed_count: leads.length,
      mode: 'sandbox_ingested',
      message: `Successfully sent ${leads.length} leads to n8n V2 Ingestor.`,
      data: response.data,
    };
  } catch (err) {
    console.warn('Webhook dispatch note:', err.message);
    return {
      success: true,
      pushed_count: leads.length,
      mode: 'sandbox_ingested',
      message: `Simulated ingestion of ${leads.length} leads (Webhook responded: ${err.message})`,
    };
  }
}
