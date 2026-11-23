import requests
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor

# Force UTF-8
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

token = ''
for env_path in ['.env', '../.env', '../.env.backend']:
    if os.path.exists(env_path):
        with open(env_path, 'r', encoding='latin-1') as ef:
            for line in ef:
                if line.startswith('HOSTINGER_TOKEN='):
                    token = line.split('=', 1)[1].strip().strip('"\'')
                    break
        if token:
            break

if not token:
    print("Error: HOSTINGER_TOKEN missing.")
    sys.exit(1)

gen_headers = {
    'Authorization': f'Bearer {token}',
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'hostinger-mcp-server/1.63.3'
}

# ONLY DASHBOARD. NEVER TOUCH ADMIN OR ROOT!
domain = 'dashboard.asquared.ae'
payload = {'username': 'u292760294', 'domain': domain}
res = requests.post('https://developers.hostinger.com/api/hosting/v1/files/upload-urls', headers=gen_headers, json=payload, timeout=20)
if res.status_code != 200:
    print(f"Failed to get upload URL: {res.status_code} {res.text}")
    sys.exit(1)

data = res.json()
upload_base_url = data['url']
auth_key = data['auth_key']
rest_auth_key = data['rest_auth_key']

dist_dir = 'client/dist'
if not os.path.exists(dist_dir):
    print(f"Error: {dist_dir} does not exist.")
    sys.exit(1)

uploads = []
for root, _, files in os.walk(dist_dir):
    for f in files:
        lpath = os.path.join(root, f)
        rel = os.path.relpath(lpath, dist_dir).replace('\\', '/')
        # Upload to root AND to dashboard/
        uploads.append((lpath, rel))
        uploads.append((lpath, f"dashboard/{rel}"))

print(f"Total files to deploy to {domain}: {len(uploads)}")

def upload_item(item):
    local_path, remote_path = item
    size = os.path.getsize(local_path)
    with open(local_path, 'rb') as f:
        content = f.read()

    target_url = f"{upload_base_url}/{remote_path}?override=true"
    post_headers = {
        'X-Auth': auth_key,
        'X-Auth-Rest': rest_auth_key,
        'Tus-Resumable': '1.0.0',
        'Upload-Length': str(size),
        'Upload-Offset': '0'
    }

    for attempt in range(1, 4):
        try:
            r_post = requests.post(target_url, headers=post_headers, timeout=20)
            if r_post.status_code not in (200, 201):
                time.sleep(1)
                continue

            loc = r_post.headers.get('Location')
            if not loc:
                time.sleep(1)
                continue

            if loc.startswith('http'):
                real_patch_url = loc
            elif loc.startswith('/rest/'):
                real_patch_url = f"https://srv529-files.hstgr.io{loc}"
            else:
                real_patch_url = f"https://srv529-files.hstgr.io/rest{loc}"

            patch_headers = {
                'X-Auth': auth_key,
                'X-Auth-Rest': rest_auth_key,
                'Tus-Resumable': '1.0.0',
                'Content-Type': 'application/offset+octet-stream',
                'Upload-Offset': '0'
            }
            r_patch = requests.patch(real_patch_url, headers=patch_headers, data=content, timeout=30)
            if r_patch.status_code in (200, 204):
                print(f"✓ {remote_path} ({size} B)", flush=True)
                return True
            time.sleep(1)
        except Exception as e:
            time.sleep(1)

    print(f"✗ FAILED: {remote_path}", flush=True)
    return False

# Sort so critical assets & index.html are uploaded cleanly
def sort_key(item):
    _, p = item
    if 'index.html' in p:
        return 1
    return 0

uploads.sort(key=sort_key)

with ThreadPoolExecutor(max_workers=8) as executor:
    results = list(executor.map(upload_item, uploads))

success = sum(1 for r in results if r)
print(f"\nFinished: {success}/{len(uploads)} successfully uploaded to {domain}.", flush=True)
