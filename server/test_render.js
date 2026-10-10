const url = "https://qgxgtavkovqklijfpnfl.supabase.co/rest/v1/owner_intelligence_leads?select=owner_id,full_name,building_name,master_area,phone_normalized,phone_raw,email,verified_bedrooms,bitrix_id&limit=50&offset=50";
const apikey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneGd0YXZrb3Zxa2xpamZwbmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjA1MzksImV4cCI6MjA5MzYzNjUzOX0.hbxMBy0qm8Q3WVQTE8218JhtGtdNm7a9rYCUisTRb08';

fetch(url, { headers: { apikey, Authorization: `Bearer ${apikey}` } })
  .then(res => res.json())
  .then(data => {
        const mapped = data.map(row => ({
          id: row.owner_id,
          name: row.full_name || 'Unknown Owner',
          building: row.building_name || 'N/A',
          area: row.master_area || 'Dubai',
          phone: row.phone_normalized || row.phone_raw || 'N/A',
          email: row.email || 'N/A',
          units: row.verified_bedrooms ? parseInt(row.verified_bedrooms) : 1,
          source: 'System Sync',
          bitrix_id: row.bitrix_id,
          portfolioValue: 'Standard',
          lastContact: row.bitrix_id ? 'In Bitrix' : 'Never'
        }));
        
        let crashed = false;
        mapped.forEach(owner => {
            try {
                const a = owner.name.charAt(0);
                const b = owner.id.substring ? owner.id.substring(0,8) : owner.id;
                const c = owner.source.length > 15 ? owner.source.substring(0,15)+'...' : owner.source;
            } catch (err) {
                console.error("CRASH ON OWNER:", owner, err);
                crashed = true;
            }
        });
        if (!crashed) console.log("PAGE 2 RENDER IS 100% SAFE!");
  })
