const fs = require('fs');
const path = require('path');

const upload_base_url = 'https://srv529-files.hstgr.io/rest/c89e20cdf14e1312/api/tus';
const auth_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoxLCJsb2NhbGUiOiJlbl9VUyIsInZpZXdNb2RlIjoibGlzdCIsInNpbmdsZUNsaWNrIjpmYWxzZSwicmVkaXJlY3RBZnRlckNvcHlNb3ZlIjpmYWxzZSwicGVybSI6eyJhZG1pbiI6ZmFsc2UsImV4ZWN1dGUiOmZhbHNlLCJjcmVhdGUiOnRydWUsInJlbmFtZSI6dHJ1ZSwibW9kaWZ5Ijp0cnVlLCJkZWxldGUiOnRydWUsInNoYXJlIjpmYWxzZSwiZG93bmxvYWQiOnRydWV9LCJjb21tYW5kcyI6W10sImxvY2tQYXNzd29yZCI6dHJ1ZSwiaGlkZURvdGZpbGVzIjpmYWxzZSwiZGF0ZUZvcm1hdCI6ZmFsc2UsInVzZXJuYW1lIjoidTI5Mjc2MDI5NCIsImFjZUVkaXRvclRoZW1lIjoiIn0sImlzcyI6IkZpbGUgQnJvd3NlciIsImV4cCI6MTc5MjQzNzY4MCwiaWF0IjoxNzkyNDE2MDgwfQ.PYmTp8N8lG0BB7uQSqb9vh_fMVU9mjqdxz6CYJNMx6g';
const rest_auth_key = '20f6247c7c5f5dea9f75ba684ab8bdb1049e45d9f578d286335f9b2573cf2df2-c89e20cdf14e1312';

const dist_dir = 'client/dist';

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

const allDistFiles = collectFiles(dist_dir);
const uploadsList = [];

for (const localPath of allDistFiles) {
  const relPath = path.relative(dist_dir, localPath).replace(/\\/g, '/');
  uploadsList.push({ localPath, remotePath: `dashboard/${relPath}` });
}

// Add API scripts
const root_dir = 'root_files';
if (fs.existsSync(root_dir)) {
  const allRootFiles = collectFiles(root_dir);
  for (const lpath of allRootFiles) {
    const rel = path.relative(root_dir, lpath).replace(/\\/g, '/');
    uploadsList.push({ localPath: lpath, remotePath: rel });
    if (rel !== 'index.php') {
      uploadsList.push({ localPath: lpath, remotePath: `dashboard/${rel}` });
    }
  }
}

// Priority sort: index.html & assets first
uploadsList.sort((a, b) => {
  const pA = a.remotePath.includes('index.html') ? 0 : a.remotePath.includes('assets/') ? 1 : 2;
  const pB = b.remotePath.includes('index.html') ? 0 : b.remotePath.includes('assets/') ? 1 : 2;
  return pA - pB;
});

console.log(`Total files to upload to admin.asquared.ae: ${uploadsList.length}`);

async function uploadOne(item) {
  const { localPath, remotePath } = item;
  const fileBytes = fs.readFileSync(localPath);
  const size = fileBytes.length;

  const targetUrl = `${upload_base_url}/${remotePath}?override=true`;
  const postHeaders = {
    'X-Auth': auth_key,
    'X-Auth-Rest': rest_auth_key,
    'Tus-Resumable': '1.0.0',
    'Upload-Length': String(size),
    'Upload-Offset': '0'
  };

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const resPost = await fetch(targetUrl, {
        method: 'POST',
        headers: postHeaders
      });

      if (resPost.status !== 200 && resPost.status !== 201) {
        console.warn(`Attempt ${attempt} POST failed for ${remotePath}: status ${resPost.status}`);
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }

      let loc = resPost.headers.get('Location');
      if (!loc) {
        console.warn(`Missing Location header for ${remotePath}`);
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }

      let patchUrl = loc;
      if (!loc.startsWith('http')) {
        if (loc.startsWith('/')) {
          patchUrl = `https://srv529-files.hstgr.io/rest${loc}`;
        } else {
          patchUrl = `https://srv529-files.hstgr.io/rest/${loc}`;
        }
      }

      const resPatch = await fetch(patchUrl, {
        method: 'PATCH',
        headers: {
          'X-Auth': auth_key,
          'X-Auth-Rest': rest_auth_key,
          'Tus-Resumable': '1.0.0',
          'Content-Type': 'application/offset+octet-stream',
          'Upload-Offset': '0'
        },
        body: fileBytes
      });

      if (resPatch.status === 204 || resPatch.status === 200) {
        console.log(`✓ Uploaded ${remotePath} (${size} B)`);
        return true;
      } else {
        console.warn(`Attempt ${attempt} PATCH failed for ${remotePath}: status ${resPatch.status}`);
        await new Promise(r => setTimeout(r, 1000));
      }
    } catch (err) {
      console.warn(`Attempt ${attempt} exception for ${remotePath}:`, err.message);
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  console.error(`✗ FAILED completely for ${remotePath}`);
  return false;
}

async function run() {
  const concurrency = 6;
  let cursor = 0;
  let successCount = 0;
  let failCount = 0;

  async function worker() {
    while (cursor < uploadsList.length) {
      const idx = cursor++;
      const item = uploadsList[idx];
      const ok = await uploadOne(item);
      if (ok) successCount++;
      else failCount++;
    }
  }

  const workers = Array(concurrency).fill(0).map(() => worker());
  await Promise.all(workers);

  console.log(`\nFinished: ${successCount} succeeded, ${failCount} failed.`);
}

run();
