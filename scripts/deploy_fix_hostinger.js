const fs = require('fs');
const path = require('path');

const upload_base_url = 'https://srv529-files.hstgr.io/rest/3254926e6def1c10/api/tus/public_html';
const auth_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoxLCJsb2NhbGUiOiJlbl9VUyIsInZpZXdNb2RlIjoibGlzdCIsInNpbmdsZUNsaWNrIjpmYWxzZSwicmVkaXJlY3RBZnRlckNvcHlNb3ZlIjpmYWxzZSwicGVybSI6eyJhZG1pbiI6ZmFsc2UsImV4ZWN1dGUiOmZhbHNlLCJjcmVhdGUiOnRydWUsInJlbmFtZSI6dHJ1ZSwibW9kaWZ5Ijp0cnVlLCJkZWxldGUiOnRydWUsInNoYXJlIjpmYWxzZSwiZG93bmxvYWQiOnRydWV9LCJjb21tYW5kcyI6W10sImxvY2tQYXNzd29yZCI6dHJ1ZSwiaGlkZURvdGZpbGVzIjpmYWxzZSwiZGF0ZUZvcm1hdCI6ZmFsc2UsInVzZXJuYW1lIjoidTI5Mjc2MDI5NCIsImFjZUVkaXRvclRoZW1lIjoiIn0sImlzcyI6IkZpbGUgQnJvd3NlciIsImV4cCI6MTc5MjYyMzMwMCwiaWF0IjoxNzkyNjAxNzAwfQ.4OuRdiXvJdDkESSt9NY4-9wrj0jJ4FI3qjI-VjrYCgg';
const rest_auth_key = '06e05ebd18b0d7d1859a3d4e6a050c6011b350ed9618bffccca13f4f106945af-3254926e6def1c10';

const base_dir = path.resolve(__dirname, '..');
const dist_dir = path.join(base_dir, 'client/dist');

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
  uploadsList.push({ localPath, remotePath: relPath });
  uploadsList.push({ localPath, remotePath: `dashboard/${relPath}` });
  uploadsList.push({ localPath, remotePath: `admin/${relPath}` });
}

// PHP endpoints and static brand assets
const phpFiles = [
  { file: 'client/public/.htaccess', remotes: ['.htaccess', 'dashboard/.htaccess', 'admin/.htaccess'] },
  { file: 'client/public/asquared-watermark.png', remotes: ['asquared-watermark.png', 'dashboard/asquared-watermark.png', 'admin/asquared-watermark.png'] },
  { file: 'client/public/api_ai_enhancer.php', remotes: ['api_ai_enhancer.php', 'dashboard/api_ai_enhancer.php', 'admin/api_ai_enhancer.php'] },
  { file: 'client/public/api_ai_copywriter.php', remotes: ['api_ai_copywriter.php', 'dashboard/api_ai_copywriter.php', 'admin/api_ai_copywriter.php'] },
  { file: 'root_files/api/generate-copy.php', remotes: ['api/generate-copy.php', 'dashboard/api/generate-copy.php', 'admin/api/generate-copy.php'] },
  { file: 'root_files/api/parse-documents.php', remotes: ['api/parse-documents.php', 'dashboard/api/parse-documents.php', 'admin/api/parse-documents.php'] },
  { file: 'client/public/generate-copy.php', remotes: ['generate-copy.php', 'dashboard/generate-copy.php', 'admin/generate-copy.php'] }
];

for (const pf of phpFiles) {
  const fullP = path.join(base_dir, pf.file);
  if (fs.existsSync(fullP)) {
    for (const rem of pf.remotes) {
      uploadsList.push({ localPath: fullP, remotePath: rem });
    }
  }
}

// Priority sort: index.html & index-*.js & api_ai_*.php first
uploadsList.sort((a, b) => {
  const getP = (p) => {
    if (p.includes('index.html')) return 0;
    if (p.includes('api_ai_copywriter')) return 1;
    if (p.includes('index-')) return 2;
    return 3;
  };
  return getP(a.remotePath) - getP(b.remotePath);
});

console.log(`Total files to upload to Hostinger: ${uploadsList.length}`);

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
      const postRes = await fetch(targetUrl, {
        method: 'POST',
        headers: postHeaders
      });

      if (postRes.status !== 201 && postRes.status !== 200) {
        const errText = await postRes.text().catch(() => '');
        throw new Error(`POST init failed: HTTP ${postRes.status} ${errText}`);
      }

      const patchHeaders = {
        'X-Auth': auth_key,
        'X-Auth-Rest': rest_auth_key,
        'Tus-Resumable': '1.0.0',
        'Upload-Offset': '0',
        'Content-Type': 'application/offset+octet-stream'
      };

      const patchRes = await fetch(targetUrl, {
        method: 'PATCH',
        headers: patchHeaders,
        body: fileBytes
      });

      if (patchRes.status === 204 || patchRes.status === 200) {
        return { success: true, remotePath };
      } else {
        const errText = await patchRes.text().catch(() => '');
        throw new Error(`PATCH body failed: HTTP ${patchRes.status} ${errText}`);
      }
    } catch (e) {
      if (attempt === 3) {
        console.error(`Failed ${remotePath}: ${e.message}`);
        return { success: false, remotePath, error: e.message };
      }
      await new Promise(r => setTimeout(r, 500 * attempt));
    }
  }
}

async function run() {
  const BATCH_SIZE = 4;
  let done = 0;
  for (let i = 0; i < uploadsList.length; i += BATCH_SIZE) {
    const chunk = uploadsList.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(chunk.map(uploadOne));
    done += chunk.length;
    process.stdout.write(`Uploaded ${done}/${uploadsList.length} files...\r`);
  }
  console.log(`\nDeployment upload complete! ${done}/${uploadsList.length} files processed.`);
}

run();
