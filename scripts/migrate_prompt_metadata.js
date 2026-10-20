const SUPABASE_BASE_URL = 'https://qgxgtavkovqklijfpnfl.supabase.co/rest/v1';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneGd0YXZrb3Zxa2xpamZwbmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwNjA1MzksImV4cCI6MjA5MzYzNjUzOX0.hbxMBy0qm8Q3WVQTE8218JhtGtdNm7a9rYCUisTRb08';

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=minimal'
};

async function sbFetch(endpoint, options = {}) {
  const url = `${SUPABASE_BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase error ${res.status}: ${text}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function migrate() {
  console.log('Fetching all listings...');
  const listings = await sbFetch('/real_estate_listings?select=*');
  console.log(`Found ${listings.length} listings. Processing metadata...`);

  for (const listing of listings) {
    let meta = {};
    if (listing.prompt && typeof listing.prompt === 'string' && listing.prompt.trim().startsWith('{')) {
      try {
        meta = JSON.parse(listing.prompt);
      } catch (e) {
        console.warn(`Could not parse prompt JSON for ${listing.id}`);
      }
    }

    const comm = meta.commercialSpecs || meta.commercial_specs || {};
    const rental = meta.rentalSpecs || meta.rental_specs || comm || {};
    const deed = meta.titleDeedData || meta.title_deed_data || {};
    const eid = meta.emiratesIdData || meta.emirates_id_data || {};
    const copy = meta.copyData || meta.copy_data || {};

    const priceNum = comm.price ? Number(String(comm.price).replace(/[^0-9.]/g, '')) : null;
    const buaNum = (comm.bua_sqft || deed.total_area_sqft || deed.suite_area_sqft) 
      ? Number(String(comm.bua_sqft || deed.total_area_sqft || deed.suite_area_sqft).replace(/[^0-9.]/g, '')) 
      : null;

    const updatePayload = {
      building_name: comm.building_name || deed.building_name || listing.name?.split('Unit')?.[0]?.trim() || null,
      unit_number: comm.unit_number || deed.unit_number || null,
      community: comm.community || deed.community || 'Dubai',
      bedrooms: comm.bedrooms || null,
      bathrooms: comm.bathrooms || null,
      price: !isNaN(priceNum) && priceNum !== 0 ? priceNum : null,
      size_sqft: !isNaN(buaNum) && buaNum !== 0 ? buaNum : null,
      furnishing: comm.furnishing || 'Unfurnished',
      purpose: comm.purpose || (comm.cheques ? 'For Rent' : 'For Sale'),
      commercial_specs: Object.keys(comm).length > 0 ? comm : listing.commercial_specs || {},
      rental_specs: Object.keys(rental).length > 0 ? rental : listing.rental_specs || {},
      dossier_data: Object.keys(deed).length > 0 ? deed : listing.dossier_data || {},
      kyc_data: Object.keys(eid).length > 0 ? eid : listing.kyc_data || {},
      copy_data: Object.keys(copy).length > 0 ? copy : listing.copy_data || {},
      updated_at: new Date().toISOString()
    };

    console.log(`Updating listing ${listing.id} (${listing.name})...`);
    try {
      await sbFetch(`/real_estate_listings?id=eq.${listing.id}`, {
        method: 'PATCH',
        body: JSON.stringify(updatePayload)
      });
      console.log(`Listing ${listing.id} updated successfully.`);
    } catch (e) {
      console.error(`Failed to update listing ${listing.id}:`, e.message);
    }

    // Migrate room types to real_estate_images
    if (meta.roomTypes && typeof meta.roomTypes === 'object') {
      for (const [imageId, roomType] of Object.entries(meta.roomTypes)) {
        if (imageId && roomType) {
          try {
            await sbFetch(`/real_estate_images?id=eq.${imageId}`, {
              method: 'PATCH',
              body: JSON.stringify({ room_type: roomType })
            });
            console.log(`Image ${imageId} tagged as ${roomType}`);
          } catch (imgErr) {
            console.warn(`Could not set room_type for image ${imageId}:`, imgErr.message);
          }
        }
      }
    }
  }

  console.log('Migration complete!');
}

migrate();
