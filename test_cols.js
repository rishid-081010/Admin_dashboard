const SYNONYMS = {
  phone: ['phone', 'mobile', 'mob', 'cell', 'contact', 'tel', 'phone 1', 'contact_no', 'contact number', 'mobile number', 'whatsapp'],
  name: ['owner name', 'name', 'full name', 'client', 'customer', 'customer name', 'owner', 'contact name'],
};
const headers = ['', '', '', 'DmSubNo', 'PropertyTypeEn', 'LandNumber', 'ProcedurePartyTypeNameEn', 'NameEn', 'Mobile'];
const lowerHeaders = headers.map(h => h.toLowerCase().trim());
const colMap = {};
const mappingUsed = {};

for (const [field, terms] of Object.entries(SYNONYMS)) {
  for (let idx = 0; idx < lowerHeaders.length; idx++) {
    const hdr = lowerHeaders[idx];
    for (const t of terms) {
      if (hdr === t || hdr.includes(t)) {
        colMap[field] = idx;
        mappingUsed[field] = headers[idx].trim();
        break;
      }
    }
    if (colMap[field] !== undefined) break;
  }
}
console.log("colMap:", colMap);
console.log("mappingUsed:", mappingUsed);
