const fs = require('fs');
const path = require('path');

function cleanAndShortenBuildingName(str) {
  if (!str) return '';
  let cleaned = String(str).trim();

  // 1. Remove unit/apartment/villa/office indicators: e.g. "Unit 1503", "Apt 204", "Flat 12", "#1503"
  cleaned = cleaned.replace(/\b(?:Unit|Apt|Apartment|Flat|Villa|Office|Penthouse|Suite|Plot|No\.?|#)\s*[\w\d-]+/gi, '');

  // 2. Remove dash/pipe separated tails (often community or bedroom info: "- Jumeirah Lakes Towers", "| Dubai Marina")
  cleaned = cleaned.split(/[-–—|]/)[0].trim();

  // 3. Clean up commas, trailing prepositions, excess spaces
  cleaned = cleaned.replace(/,\s*$/, '').trim();
  cleaned = cleaned.replace(/\s+/g, ' ');

  // 4. If all UPPERCASE and length > 3, convert to Title Case (e.g. "V3 TOWER" -> "V3 Tower")
  if (cleaned === cleaned.toUpperCase() && cleaned.length > 3) {
    cleaned = cleaned
      .toLowerCase()
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  // 5. Ensure it doesn't exceed 28 characters
  if (cleaned.length > 28) {
    cleaned = cleaned.slice(0, 28).trim();
  }

  return cleaned;
}

// Test deterministic cleaner
const testCases = [
  'V3 TOWER Unit 1503 - Jumeirah Lakes Towers (JLT)',
  'BURJ KHALIFA - Unit 4502, Downtown Dubai',
  'Marina Gate Tower 1 - Apt 1204 - Dubai Marina',
  'Palace Residences North, Dubai Creek Harbour - 2BR',
  'Al Bateen Residences - JBR, Walk',
  'PRINCESS TOWER',
  'Unit 502, Elite Residence',
];

console.log('--- Deterministic cleaner results ---');
testCases.forEach(tc => {
  console.log(`"${tc}" -> "${cleanAndShortenBuildingName(tc)}"`);
});
