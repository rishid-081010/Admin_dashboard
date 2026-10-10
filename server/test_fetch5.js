const url = "https://qgxgtavkovqklijfpnfl.supabase.co/rest/v1/owner_intelligence_leads?select=owner_id,full_name,building_name,master_area,phone_normalized,phone_raw,email,verified_bedrooms,bitrix_id&limit=50&offset=50";
const apikey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneGd0YXZrb3Zxa2xpamZwbmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjA1MzksImV4cCI6MjA5MzYzNjUzOX0.hbxMBy0qm8Q3WVQTE8218JhtGtdNm7a9rYCUisTRb08';

fetch(url, { headers: { apikey, Authorization: `Bearer ${apikey}` } })
  .then(res => res.json())
  .then(data => {
    let hasNullId = false;
    data.forEach((row, i) => {
        if (!row.owner_id) {
            console.log("NULL OWNER ID AT INDEX", i, row);
            hasNullId = true;
        }
    });
    if (!hasNullId) console.log("NO NULL IDS FOUND.");
  })
