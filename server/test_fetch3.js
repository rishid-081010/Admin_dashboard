const url = "https://qgxgtavkovqklijfpnfl.supabase.co/rest/v1/owner_intelligence_leads?select=*&limit=1";
const apikey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneGd0YXZrb3Zxa2xpamZwbmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjA1MzksImV4cCI6MjA5MzYzNjUzOX0.hbxMBy0qm8Q3WVQTE8218JhtGtdNm7a9rYCUisTRb08';

fetch(url, { headers: { apikey, Authorization: `Bearer ${apikey}` } })
  .then(res => res.json())
  .then(data => {
    console.log(Object.keys(data[0]));
  });
