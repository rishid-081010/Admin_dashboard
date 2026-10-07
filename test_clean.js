function cleanTxt(txt) {
  if (txt === null || txt === undefined) return '';
  let t = String(txt).trim();
  const DUMMY_STRINGS = ['null', 'n/a', 'na', 'none', '-', '0', 'undefined', 'nil', 'unknown', '.', 'n.a', 'not available'];
  if (DUMMY_STRINGS.includes(t.toLowerCase())) return '';
  return t;
}

const rawName = "Seller";
const rawNameClean = cleanTxt(rawName);
const cleanName = rawNameClean ? rawNameClean.replace(/\b\w/g, c => c.toUpperCase()) : 'Property Owner';
console.log(cleanName);
