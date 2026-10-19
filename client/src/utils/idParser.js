/**
 * Intelligently parse any ID search string regardless of formatting, spacing, punctuation, or case.
 * 
 * Supports:
 * - Lead IDs: "LEAD-1433897", "lead 1433897", "lead#1433897", "lead: 1433897", "lead_id 1433897", "lead-01433897", "lead 13822"
 * - Bitrix IDs: "bitrix 33271", "bitrix#33271", "crm 33271", "crm#33271", "bitrix_id: 33271", "b 33271"
 * - Master Leads IDs: "master 2723960", "master lead 2723960", "master leads 2723960", "master_id 2723960", "own 2723960", "OWN-2723960", "owner 2723960", "owner_id 2723960", "supabase 2723960"
 * - Pure Numbers & Generic IDs: "1433897", "#1433897", "№ 1433897", "01433897", "33271", "0013822", "13822"
 * - Phone numbers: "+971508595718", "0508595718"
 */
export function parseIdQuery(term) {
  if (!term || typeof term !== 'string') return null;
  const raw = term.trim();
  const digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return null;

  const intVal = parseInt(digits, 10);
  const padded7 = String(intVal).padStart(7, '0');
  const padded6 = String(intVal).padStart(6, '0');
  const uniqueDigits = Array.from(new Set([digits, String(intVal), padded7, padded6]));

  const wrapped = ' ' + raw + ' ';
  const isEidExplicit = /(\b|[\s\-_:#])(eid|emirates\s*id|national\s*id)(\b|[\s\-_:#])/i.test(wrapped) || digits.startsWith('784');
  const isPhoneExplicit = !isEidExplicit && (/(\b|[\s\-_:#])(phone|tel|mobile|whatsapp)(\b|[\s\-_:#])/i.test(wrapped) || raw.startsWith('+'));
  const isMasterExplicit = /(\b|[\s\-_:#])(master\s*leads?\s*(id)?|master_id|master|owner_id|owner|owners|own|supabase)(\b|[\s\-_:#])/i.test(wrapped) || raw.toUpperCase().startsWith('OWN-');
  const isBitrixExplicit = /(\b|[\s\-_:#])(bitrix_id|bitrix|crm_id|crm)(\b|[\s\-_:#])/i.test(wrapped);
  const isLeadExplicit = !isMasterExplicit && !isEidExplicit && ( /(\b|[\s\-_:#])(lead_id|leadid|leads?|ld)(\b|[\s\-_:#])/i.test(wrapped) || raw.toUpperCase().startsWith('LEAD-') );

  let intent = 'any';
  if (isEidExplicit) intent = 'eid';
  else if (isPhoneExplicit) intent = 'phone';
  else if (isMasterExplicit) intent = 'owner';
  else if (isBitrixExplicit) intent = 'bitrix';
  else if (isLeadExplicit) intent = 'lead';

  const eidVariants = [];
  if (digits.startsWith('784')) {
    eidVariants.push(digits);
    eidVariants.push(digits + '.0');
    if (digits.length === 15) {
      eidVariants.push(`${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 14)}-${digits.slice(14)}`);
    }
  }
  if (raw && !eidVariants.includes(raw)) {
    eidVariants.push(raw);
  }

  return {
    raw,
    digits,
    intVal,
    intent,
    leadVariants: uniqueDigits.map(d => 'LEAD-' + d),
    ownerVariants: uniqueDigits.map(d => 'OWN-' + d),
    bitrixVariants: Array.from(new Set([String(intVal), digits])),
    eidVariants: Array.from(new Set(eidVariants))
  };
}

/**
 * Checks if a specific target value matches a parsed query or raw search term.
 */
export function isIdMatched(targetValue, queryTerm) {
  if (!targetValue || !queryTerm) return false;
  const parsed = parseIdQuery(queryTerm);
  if (!parsed) return false;

  const cleanTarget = String(targetValue).trim().toUpperCase();
  const targetDigits = cleanTarget.replace(/[^0-9]/g, '');

  if (parsed.eidVariants && parsed.eidVariants.some(v => v.toUpperCase() === cleanTarget)) {
    return true;
  }

  if (targetDigits === parsed.digits || parseInt(targetDigits, 10) === parsed.intVal) {
    return true;
  }
  return false;
}
