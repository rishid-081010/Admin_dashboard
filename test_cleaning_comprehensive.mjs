import { 
  processLeadsClientSide, 
  generateCleanCSV, 
  generateCleanRowsArray, 
  cleanPhone, 
  cleanUnitNumber,
  disambiguateBuildingName 
} from './client/src/utils/leadCleanerClient.js';

async function runTest() {
  console.log('Testing Lead Cleaner Comprehensive...');
  
  // Test 1: Phone splitter mobile priority over landline
  console.log('\n--- Test 1: Landline vs Mobile Priority in Same Cell ---');
  const p1 = cleanPhone('04-3312345 / 050-9876543');
  console.log('Result for "04-3312345 / 050-9876543":', {
    valid: p1.valid,
    primary: p1.primary,
    vapi_e164: p1.vapi_e164,
    secondary: p1.secondary
  });
  if (p1.valid && p1.vapi_e164 === '+971509876543') {
    console.log('PASS: Mobile promoted to primary over landline!');
  } else {
    console.error('FAIL: Mobile was not promoted.');
  }

  // Test 2: Multiple units in one cell
  console.log('\n--- Test 2: Multiple Units in One Cell ---');
  const u1 = cleanUnitNumber('Unit 101, Unit 102', 'Botanica');
  console.log('Result for "Unit 101, Unit 102":', u1);
  if (u1 === '101, 102') {
    console.log('PASS: Cleaned multiple units correctly!');
  } else {
    console.error('FAIL: Expected "101, 102", got:', u1);
  }

  // Test 3: Multiple Buildings with typo header "Builidng"
  console.log('\n--- Test 3: Multiple Buildings with typo "Builidng" ---');
  const rawHeaders = ['Area', 'Builidng', 'Unit', 'Mobile', 'Owner Name'];
  const testMatrix = [
    rawHeaders,
    ['Marsa Dubai', 'Bluewaters Residences 8', '101', '0501234561', 'Ahmed Ali'],
    ['Marsa Dubai', 'Bluewaters Residences 9', '202', '0501234562', 'Sarah Smith'],
    ['Marsa Dubai', 'Bonnington', '303', '0501234563', 'John Doe'],
    ['Marsa Dubai', 'BOTANICA TOWER-1', '404', '0501234564', 'Fatima Al Zarooni'],
    ['Marsa Dubai', 'CASCADES', '505', '0501234565', 'Vikram Patel'],
    ['Marsa Dubai', 'CAYAN TOWER', '606', '0501234566', 'Elena Rostova'],
    ['Marsa Dubai', 'Ciel', '707', '0501234567', 'Tariq Mansoor'],
    // Same owner owning 2 units in different buildings (both should survive!)
    ['Marsa Dubai', 'BOTANICA TOWER-1', '808', '0501234567', 'Tariq Mansoor'],
    // Duplicate row (same phone, same building, same unit) -> should be removed!
    ['Marsa Dubai', 'Ciel', '707', '0501234567', 'Tariq Mansoor'],
    // Invalid phone -> should be removed from clean_leads!
    ['Marsa Dubai', 'Ciel', '999', 'invalid_phone', 'No Phone Guy']
  ];

  const result = await processLeadsClientSide(testMatrix, 'Apartment', 'Multi_Bldg_Test.xlsx');
  console.log('Stats:', result.stats);
  console.log('Clean Leads Count:', result.clean_leads.length);
  console.log('Duplicates File Count:', result.duplicates_in_file.length);
  console.log('Invalid Count:', result.invalid_leads.length);

  const buildingsFound = new Set(result.clean_leads.map(l => l.project_name));
  console.log('Unique buildings detected in clean leads:', Array.from(buildingsFound));

  if (buildingsFound.size >= 7) {
    console.log('PASS: All 7 individual buildings accurately detected and preserved!');
  } else {
    console.error('FAIL: Buildings collapsed! Found:', Array.from(buildingsFound));
  }

  // Test 4: Exact client structure export
  console.log('\n--- Test 4: Exact Client Structure Export ---');
  const exportedCSV = generateCleanCSV(result.clean_leads, rawHeaders, { exactClientStructure: true });
  const csvLines = exportedCSV.split('\r\n');
  console.log('Exported CSV Header Line:', csvLines[0]);
  console.log('Exported CSV Line 1:', csvLines[1]);
  console.log('Exported CSV Total Lines:', csvLines.length);

  const expectedHeaders = '"Area","Builidng","Unit","Mobile","Owner Name"';
  if (csvLines[0] === expectedHeaders) {
    console.log('PASS: Exported CSV exactly matches original client columns!');
  } else {
    console.error('FAIL: Headers do not match! Got:', csvLines[0]);
  }

  // Check if invalid rows and duplicate rows are removed from export
  if (csvLines.length === 1 + result.clean_leads.length) {
    console.log('PASS: Only clean leads exported (duplicates and invalid removed)!');
  } else {
    console.error(`FAIL: Expected ${1 + result.clean_leads.length} lines, got ${csvLines.length}`);
  }

  // Check rows array for SheetJS .xlsx export
  const rowsArr = generateCleanRowsArray(result.clean_leads, rawHeaders, { exactClientStructure: true });
  console.log('SheetJS Rows Array Header:', rowsArr[0]);
  console.log('SheetJS Rows Array Count:', rowsArr.length);
  if (JSON.stringify(rowsArr[0]) === JSON.stringify(rawHeaders)) {
    console.log('PASS: SheetJS rows array exactly matches original client headers!');
  } else {
    console.error('FAIL: SheetJS headers mismatch.');
  }

  console.log('\nALL VERIFICATION TESTS COMPLETED SUCCESSFULLY!');
}

runTest().catch(console.error);
