const SYNONYMS = {
  phone: ['phone', 'mobile', 'mob', 'cell', 'contact', 'tel', 'phone 1', 'contact_no', 'contact number', 'mobile number', 'whatsapp'],
  name: ['owner name', 'name', 'full name', 'client', 'customer', 'customer name', 'owner', 'contact name'],
  project: ['project name', 'project', 'building', 'building name', 'tower', 'tower name', 'property name', 'development', 'residence'],
  location: ['location', 'area', 'community', 'sub community', 'sub-community', 'district', 'zone', 'city'],
  unit: ['unit number', 'unit no', 'unit', 'flat', 'flat no', 'apt', 'apartment no', 'villa no'],
  property_type: ['property type', 'type', 'unit type', 'category', 'usage'],
};

function detectColumns(headers) {
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
  return colMap;
}

const headers = ['DmSubNo', 'PropertyTypeEn', 'LandNumber', 'ProcedurePartyTypeNameEn', 'NameEn', 'Mobile', 'ProcedureNameEn', 'CountryNameEn', 'IdNumber', 'UaeIdNumber'];
console.log(detectColumns(headers));
