const fs = require('fs');
const path = require('path');

const upload_base_url = 'https://srv529-files.hstgr.io/rest/f9ff99f8ea66cd48/api/tus';
const auth_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoxLCJsb2NhbGUiOiJlbl9VUyIsInZpZXdNb2RlIjoibGlzdCIsInNpbmdsZUNsaWNrIjpmYWxzZSwicmVkaXJlY3RBZnRlckNvcHlNb3ZlIjpmYWxzZSwicGVybSI6eyJhZG1pbiI6ZmFsc2UsImV4ZWN1dGUiOmZhbHNlLCJjcmVhdGUiOnRydWUsInJlbmFtZSI6dHJ1ZSwibW9kaWZ5Ijp0cnVlLCJkZWxldGUiOnRydWUsInNoYXJlIjpmYWxzZSwiZG93bmxvYWQiOnRydWV9LCJjb21tYW5kcyI6W10sImxvY2tQYXNzd29yZCI6dHJ1ZSwiaGlkZURvdGZpbGVzIjpmYWxzZSwiZGF0ZUZvcm1hdCI6ZmFsc2UsInVzZXJuYW1lIjoidTI5Mjc2MDI5NCIsImFjZUVkaXRvclRoZW1lIjoiIn0sImlzcyI6IkZpbGUgQnJvd3NlciIsImV4cCI6MTc5MjQyNjM1MSwiaWF0IjoxNzkyNDA0NzUxfQ.6NmIuwC1rcvJnUsplPbJ_c2GtTg_1ku16upi9lBfVpg';
const rest_auth_key = 'e8e5d0aec58092ba62eb6dff8fa074e2b22aab26e52eefc975b29abb7784d410-f9ff99f8ea66cd48';

const dist_dir = 'client/dist';

function collectFiles(dir) {
  let results = [];
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
  uploadsList.push({ localPath, remotePath: `public/dashboard/${relPath}` });
  uploadsList.push({ localPath, remotePath: `dashboard/${relPath}` });

  if (relPath.startsWith('uploads/')) {
    uploadsList.push({ localPath, remotePath: `public/${relPath}` });
    uploadsList.push({ localPath, remotePath: relPath });
  }
}

// Add root entrypoint files and api proxies if present
const root_dir = 'root_files';
if (fs.existsSync(root_dir)) {
  const allRootFiles = collectFiles(root_dir);
  for (const lpath of allRootFiles) {
    const rel = path.relative(root_dir, lpath).replace(/\\/g, '/');
    uploadsList.push({ localPath: lpath, remotePath: rel });
    uploadsList.push({ localPath: lpath, remotePath: `public/${rel}` });
  }
}

// Priority sort: index.html & assets first
uploadsList.sort((a, b) => {
  const pA = a.remotePath.includes('index.html') ? 0 : a.remotePath.includes('assets/') ? 1 : 2;
  const pB = b.remotePath.includes('index.html') ? 0 : b.remotePath.includes('assets/') ? 1 : 2;
  return pA - pB;
});

console.log(`Total files to upload: ${uploadsList.length}`);

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

      const patchHeaders = {
        'X-Auth': auth_key,
        'X-Auth-Rest': rest_auth_key,
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
      } else {
        console.warn(`Attempt ${attempt} PATCH returned ${resPatch.status} for ${remotePath}`);
      }
    } catch (err) {
      console.warn(`Attempt ${attempt} error for ${remotePath}:`, err.message);
    }
    await new Promise(r => setTimeout(r, 1500));
  }
  console.error(`✗ FAILED completely for ${remotePath}`);
  return false;
}

async function runPool(items, limit = 5) {
  let index = 0;
  let failed = 0;
  let done = 0;

  async function worker() {
    while (index < items.length) {
      const current = items[index++];
      const ok = await uploadOne(current);
      if (ok) done++;
      else failed++;
    }
  }

  const workers = Array.from({ length: limit }, () => worker());
  await Promise.all(workers);
  console.log(`Finished: ${done} succeeded, ${failed} failed.`);
}

runPool(uploadsList, 6);
