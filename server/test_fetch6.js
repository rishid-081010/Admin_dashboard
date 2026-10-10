const url = "https://qgxgtavkovqklijfpnfl.supabase.co/rest/v1/owner_intelligence_leads?select=owner_id,full_name,building_name,master_area,phone_normalized,phone_raw,email,verified_bedrooms,bitrix_id&limit=50&offset=50";
const apikey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneGd0YXZrb3Zxa2xpamZwbmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjA1MzksImV4cCI6MjA5MzYzNjUzOX0.hbxMBy0qm8Q3WVQTE8218JhtGtdNm7a9rYCUisTRb08';

fetch(url, { headers: { apikey, Authorization: `Bearer ${apikey}` } })
  .then(res => res.json())
  .then(data => {
    data.forEach((row, i) => {
        if (typeof row.full_name !== 'string' && row.full_name !== null) {
            console.log("NON-STRING FULL_NAME AT INDEX", i, row.full_name);
        }
    });
    console.log("Finished checking types.");
  })
