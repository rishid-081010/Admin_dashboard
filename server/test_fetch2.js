const url = "https://qgxgtavkovqklijfpnfl.supabase.co/rest/v1/owner_intelligence_leads?select=owner_id,full_name,building_name,master_area,phone_normalized,contact_number,email_normalized,verified_bedrooms,is_golden_visa_eligible,bitrix_id&limit=50&offset=0";
const apikey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneGd0YXZrb3Zxa2xpamZwbmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjA1MzksImV4cCI6MjA5MzYzNjUzOX0.hbxMBy0qm8Q3WVQTE8218JhtGtdNm7a9rYCUisTRb08';

fetch(url, { headers: { apikey, Authorization: `Bearer ${apikey}` } })
  .then(res => res.json())
  .then(data => {
    if (data.error || data.message || data.code) console.error("ERROR:", data);
    else console.log("DATA LENGTH:", data.length);
  })
  .catch(err => console.error("ERROR:", err));
