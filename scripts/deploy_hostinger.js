const fs = require('fs');
const path = require('path');

const token = process.env.HOSTINGER_API_TOKEN;
if (!token) {
  console.error('Error: HOSTINGER_API_TOKEN is missing from environment.');
  process.exit(1);
}

async function getCredentials() {
  for (let attempt = 1; attempt <= 15; attempt++) {
    console.log(`Requesting upload credentials for admin.asquared.ae (Attempt ${attempt}/15)...`);
    try {
      const res = await fetch('https://developers.hostinger.com/api/hosting/v1/files/upload-urls', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'hostinger-mcp-server/1.63.3'
        },
        body: JSON.stringify({ domain: 'admin.asquared.ae', username: 'u292760294' })
      });

      if (res.ok) {
        const data = await res.json();
        console.log('✓ Successfully acquired Hostinger upload credentials for admin.asquared.ae');
        return {
          upload_base_url: data.url,
          auth_key: data.auth_key,
          rest_auth_key: data.rest_auth_key
        };
      }
      console.warn(`Attempt ${attempt} Hostinger API returned ${res.status}. Retrying in 3s...`);
    } catch (err) {
      console.warn(`Attempt ${attempt} error: ${err.message}. Retrying in 3s...`);
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error('Hostinger API failed to return credentials after 15 attempts.');
}

const dist_dir = path.resolve(__dirname, '../client/dist');

function collectFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(collectFiles(fullPath));
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

async function uploadOne(item, creds) {
  const { localPath, remotePath } = item;
  const fileBytes = fs.readFileSync(localPath);
  const size = fileBytes.length;

  const targetUrl = `${creds.upload_base_url}/${remotePath}?override=true`;
  const postHeaders = {
    'X-Auth': creds.auth_key,
    'X-Auth-Rest': creds.rest_auth_key,
    'Tus-Resumable': '1.0.0',
    'Upload-Length': String(size),
    'Upload-Offset': '0'
  };

  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const resPost = await fetch(targetUrl, {
        method: 'POST',
        headers: postHeaders
      });

      if (resPost.status !== 200 && resPost.status !== 201) {
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }

      let loc = resPost.headers.get('Location');
      if (!loc) {
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }

      let patchUrl = loc;
      if (!loc.startsWith('http')) {
        patchUrl = `https://srv529-files.hstgr.io/rest${loc.startsWith('/') ? '' : '/'}${loc}`;
      }

      const patchHeaders = {
        'X-Auth': creds.auth_key,
        'X-Auth-Rest': creds.rest_auth_key,
        'Tus-Resumable': '1.0.0',
        'Content-Type': 'application/offset+octet-stream',
        'Upload-Offset': '0'
      };

      const resPatch = await fetch(patchUrl, {
        method: 'PATCH',
        headers: patchHeaders,
        body: fileBytes
      });

      if (resPatch.status === 200 || resPatch.status === 204) {
        console.log(`✓ Uploaded ${remotePath} (${size} B)`);
        return true;
      }
    } catch (err) {
      // Retry
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  console.error(`✗ FAILED completely for ${remotePath}`);
  return false;
}

async function runPool(items, creds, limit = 5) {
  let index = 0;
  let done = 0;
  let failed = 0;

  async function worker() {
    while (index < items.length) {
      const current = items[index++];
      const ok = await uploadOne(current, creds);
      if (ok) done++;
      else failed++;
    }
  }

  const workers = Array.from({ length: limit }, () => worker());
  await Promise.all(workers);
  console.log(`Deployment summary: ${done} succeeded, ${failed} failed.`);
}

async function main() {
  const creds = await getCredentials();
  const allDistFiles = collectFiles(dist_dir);
  console.log(`Found ${allDistFiles.length} dist files to deploy to admin.asquared.ae.`);

  const uploadsList = [];
  for (const localPath of allDistFiles) {
    const relPath = path.relative(dist_dir, localPath).replace(/\\/g, '/');
    // Deploy to both dashboard/${relPath} and public_html/dashboard/${relPath}
    uploadsList.push({ localPath, remotePath: `dashboard/${relPath}` });
    uploadsList.push({ localPath, remotePath: `public_html/dashboard/${relPath}` });
  }

  // Priority sort: index.html & core assets first
  uploadsList.sort((a, b) => {
    const pA = a.remotePath.includes('index.html') ? 0 : a.remotePath.includes('assets/index') ? 1 : 2;
    const pB = b.remotePath.includes('index.html') ? 0 : b.remotePath.includes('assets/index') ? 1 : 2;
    return pA - pB;
  });

  console.log(`Total target paths to deploy: ${uploadsList.length}`);
  await runPool(uploadsList, creds, 5);
}

main().catch((err) => {
  console.error('Fatal deployment error:', err);
  process.exit(1);
});
