import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { applyASquaredWatermark } from './qaEnhancer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = "https://qgxgtavkovqklijfpnfl.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneGd0YXZrb3Zxa2xpamZwbmZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA2MDUzOSwiZXhwIjoyMDkzNjM2NTM5fQ.X8Lpgzpm1Xgb0v9qML9W6Xm3hDKCwFVeniJs39F5z54";

async function run() {
  const imgPath = path.join(__dirname, '../../test_portrait_enhanced.jpg');
  console.log('1. Applying A Squared watermark to portrait enhanced photo...');
  await applyASquaredWatermark(imgPath);

  const watermarkedBuffer = fs.readFileSync(imgPath);
  console.log('Watermarked image size:', watermarkedBuffer.length);

  const listingId = '15c0bb91-20eb-4660-8a60-1078ed867524';
  const filename = `${Date.now()}_enhanced_flare.jpg`;
  const storagePath = `generated/${listingId}/${filename}`;
  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/property-images/${storagePath}`;

  console.log('2. Uploading to Supabase Storage:', uploadUrl);
  const upRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'image/jpeg',
      'x-upsert': 'true'
    },
    body: watermarkedBuffer
  });

  console.log('Upload HTTP status:', upRes.status);
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/property-images/${storagePath}`;
  console.log('Public URL:', publicUrl);

  console.log('3. Updating image record in database...');
  const imageId = '4eb64e8b-0851-414f-8700-e773d9169938';
  const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/real_estate_images?id=eq.${imageId}`, {
    method: 'PATCH',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    },
    body: JSON.stringify({
      generated_image_location: publicUrl,
      baseline_image_location: publicUrl,
      status: 'completed'
    })
  });
  console.log('Database patch HTTP status:', patchRes.status);
  console.log('Successfully updated image to flawless portrait alignment!');
}

run().catch(console.error);
