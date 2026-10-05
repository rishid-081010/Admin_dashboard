import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://qgxgtavkovqklijfpnfl.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFneGd0YXZrb3Zxa2xpamZwbmZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODA2MDUzOSwiZXhwIjoyMDkzNjM2NTM5fQ.X8Lpgzpm1Xgb0v9qML9W6Xm3hDKCwFVeniJs39F5z54');

async function test() {
  const { data, error } = await supabase.storage.createBucket('property-images', { public: true });
  console.log('Error:', error);
  console.log('Data:', data);
}

test();
