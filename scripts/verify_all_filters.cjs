const SUPABASE_API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneGd0YXZrb3Zxa2xpamZwbmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjA1MzksImV4cCI6MjA5MzYzNjUzOX0.hbxMBy0qm8Q3WVQTE8218JhtGtdNm7a9rYCUisTRb08';
const BASE_URL = 'https://qgxgtavkovqklijfpnfl.supabase.co/rest/v1/canonical_owners';

const headers = {
  apikey: SUPABASE_API_KEY,
  Authorization: `Bearer ${SUPABASE_API_KEY}`,
  Prefer: 'count=exact'
};

async function runTest(testName, queryParams) {
  const url = `${BASE_URL}?select=canonical_owner_id,full_name,primary_building,primary_area,primary_property_type,bedrooms,source_file,registration_date&limit=5&${queryParams}`;
  try {
    const res = await fetch(url, { headers });
    const contentRange = res.headers.get('content-range');
    if (!res.ok) {
      const errText = await res.text();
      console.log(`❌ [FAIL] ${testName}: Status ${res.status} - ${errText}`);
      return false;
    }
    const data = await res.json();
    console.log(`✅ [PASS] ${testName}: Status ${res.status} | Content-Range: ${contentRange} | Returned: ${data.length} rows`);
    if (data.length > 0) {
      console.log(`   Sample: ID=${data[0].canonical_owner_id}, Name=${data[0].full_name || 'N/A'}, Bldg=${data[0].primary_building || 'N/A'}, Type=${data[0].primary_property_type || 'N/A'}, Beds=${data[0].bedrooms}`);
    }
    return true;
  } catch (err) {
    console.log(`❌ [EXCEPTION] ${testName}: ${err.message}`);
    return false;
  }
}

async function verifyAll() {
  console.log('====================================================');
  console.log('🧪 RUNNING COMPREHENSIVE OWNERS DATA FILTERS VERIFICATION');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  // 1. Search with Comma Sanitization
  total++;
  const cleanQ1 = 'Emaar, Downtown'.replace(/[,():]/g, ' ').replace(/\s+/g, ' ').trim();
  const enc1 = encodeURIComponent(cleanQ1);
  if (await runTest('1. Search with comma (Sanitized)', `or=(full_name.ilike.*${enc1}*,primary_building.ilike.*${enc1}*)`)) passed++;

  // 2. Search with Parentheses Sanitization
  total++;
  const cleanQ2 = 'Tower (A)'.replace(/[,():]/g, ' ').replace(/\s+/g, ' ').trim();
  const enc2 = encodeURIComponent(cleanQ2);
  if (await runTest('2. Search with parentheses (Sanitized)', `or=(primary_building.ilike.*${enc2}*)`)) passed++;

  // 3. Emirates ID search
  total++;
  const eidSearch = '784';
  if (await runTest('3. Emirates ID search (indexed column)', `or=(emirates_id.ilike.*${eidSearch}*)`)) passed++;

  // 4. Area: Downtown Dubai (includes Burj Khalifa)
  total++;
  if (await runTest('4. Area Filter: Downtown Dubai (Burj Khalifa + Downtown)', `or=(primary_area.ilike.*Downtown*,primary_area.ilike.*Burj Khalifa*)`)) passed++;

  // 5. Area: JLT (includes Jumeirah Lake*)
  total++;
  if (await runTest('5. Area Filter: JLT (Jumeirah Lake*)', `primary_area=ilike.*Jumeirah Lake*`)) passed++;

  // 6. Area: Dubai Marina (includes Marsa Dubai)
  total++;
  if (await runTest('6. Area Filter: Dubai Marina (Marsa Dubai + Dubai Marina)', `or=(primary_area.ilike.*Dubai Marina*,primary_area.ilike.*Marsa Dubai*)`)) passed++;

  // 7. Property Subtype: Flat
  total++;
  if (await runTest('7. Property Subtype: Flat', `primary_property_type=ilike.*Flat*`)) passed++;

  // 8. Property Subtype: Villa
  total++;
  if (await runTest('8. Property Subtype: Villa', `primary_property_type=ilike.*Villa*`)) passed++;

  // 9. Bedrooms: 2 Bedrooms
  total++;
  if (await runTest('9. Bedrooms Filter: 2 Beds', `bedrooms=eq.2`)) passed++;

  // 10. Bedrooms: 5+ Bedrooms
  total++;
  if (await runTest('10. Bedrooms Filter: 5+ Beds', `bedrooms=gte.5`)) passed++;

  // 11. Bedrooms: Studio (0 Beds)
  total++;
  if (await runTest('11. Bedrooms Filter: Studio (0)', `bedrooms=eq.0`)) passed++;

  // 12. Date Range Filter
  total++;
  if (await runTest('12. Date Range Filter: 2020 to 2024', `registration_date=gte.2020-01-01&registration_date=lte.2024-12-31`)) passed++;

  // 13. Portfolio Size: Multi-Unit (2+)
  total++;
  if (await runTest('13. Portfolio Size: 2+ Units', `total_units=gte.2`)) passed++;

  // 14. Assigned Agent Filter
  total++;
  if (await runTest('14. Assigned Agent Filter: Melanie Simsiman', `assigned_agent=eq.Melanie%20Simsiman`)) passed++;

  // 15. Unassigned Agent Filter
  total++;
  if (await runTest('15. Unassigned Agent Filter', `assigned_agent=is.null`)) passed++;

  console.log('\n====================================================');
  console.log(`RESULTS: ${passed}/${total} TESTS PASSED`);
  console.log('====================================================');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

verifyAll();
