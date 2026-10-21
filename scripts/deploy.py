import requests
import os
import sys

token = os.environ.get('HOSTINGER_TOKEN')
if not token:
    print("Error: HOSTINGER_TOKEN environment variable is missing.")
    sys.exit(1)

gen_headers = {
    'Authorization': f'Bearer {token}',
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'User-Agent': 'hostinger-mcp-server/1.63.3'
}

gen_url = 'https://developers.hostinger.com/api/hosting/v1/files/upload-urls'
candidate_payloads = [
    {'username': 'u292760294', 'domain': 'admin.asquared.ae'},
    {'username': 'u292760294', 'domain': 'asquared.ae'}
]

import time
r = None
for payload in candidate_payloads:
    domain_target = payload['domain']
    print(f"Requesting upload URL for {domain_target}...")
    for attempt in range(1, 4):
        try:
            res = requests.post(gen_url, headers=gen_headers, json=payload, timeout=30)
            if res.status_code == 200:
                r = res
                print(f"✓ Obtained upload URL using {domain_target}")
                break
            print(f"Attempt {attempt} for {domain_target}: Hostinger API returned {res.status_code}: {res.text}. Retrying in {attempt * 3}s...")
        except Exception as e:
            print(f"Attempt {attempt} for {domain_target}: Exception: {e}. Retrying in {attempt * 3}s...")
        time.sleep(attempt * 3)
    if r and r.status_code == 200:
        break

if not r or r.status_code != 200:
    print("Error connecting to Hostinger API after all attempts:", r.text if r else "No response")
    sys.exit(1)

data = r.json()
upload_base_url = data['url']
auth_key = data['auth_key']
rest_auth_key = data['rest_auth_key']

dist_dir = 'client/dist'
if not os.path.exists(dist_dir):
    print(f"Error: {dist_dir} does not exist. Did you run npm run build?")
    sys.exit(1)

uploads_list = []
for root, _, files in os.walk(dist_dir):
    for file in files:
        local_path = os.path.join(root, file)
        # Convert path to posix format for URL
        rel_path = os.path.relpath(local_path, dist_dir).replace('\\\\', '/').replace('\\', '/')
        # Deploy to all domain roots (dashboard, admin, root) to prevent version drift
        uploads_list.append((local_path, f"public/dashboard/{rel_path}"))
        uploads_list.append((local_path, f"dashboard/{rel_path}"))
        uploads_list.append((local_path, f"public/admin/{rel_path}"))
        uploads_list.append((local_path, f"admin/{rel_path}"))
        uploads_list.append((local_path, f"public/{rel_path}"))
        uploads_list.append((local_path, rel_path))
        # If it's in audits/, also deploy to public/audits and audits
        if rel_path.startswith('audits/'):
            uploads_list.append((local_path, f"public/{rel_path}"))
            uploads_list.append((local_path, rel_path))
        # If it's in exports/, also deploy to public/exports and exports
        if rel_path.startswith('exports/'):
            uploads_list.append((local_path, f"public/{rel_path}"))
            uploads_list.append((local_path, rel_path))
        # If it's in uploads/, also deploy to public/uploads and uploads
        if rel_path.startswith('uploads/'):
            uploads_list.append((local_path, f"public/{rel_path}"))
            uploads_list.append((local_path, rel_path))
        # If it's in templates/, also deploy to public/templates and templates
        if rel_path.startswith('templates/'):
            uploads_list.append((local_path, f"public/{rel_path}"))
            uploads_list.append((local_path, rel_path))
        # If it's a php endpoint, also deploy to public/ and root
        if rel_path.endswith('.php'):
            uploads_list.append((local_path, f"public/{rel_path}"))
            uploads_list.append((local_path, rel_path))

# Deploy root domain entrypoint files and API scripts
root_dir = 'root_files'
if os.path.exists(root_dir):
    for r_dir, _, r_files in os.walk(root_dir):
        for f in r_files:
            lpath = os.path.join(r_dir, f)
            rel_f = os.path.relpath(lpath, root_dir).replace('\\', '/')
            # Root entrypoint files (index.html, index.php) should ONLY live at the root domain
            # Never overwrite React client index.html in dashboard/ or admin/
            if rel_f in ('index.html', 'index.php'):
                uploads_list.append((lpath, rel_f))
                uploads_list.append((lpath, f"public/{rel_f}"))
            else:
                uploads_list.append((lpath, rel_f))
                uploads_list.append((lpath, f"public/{rel_f}"))
                uploads_list.append((lpath, f"dashboard/{rel_f}"))
                uploads_list.append((lpath, f"admin/{rel_f}"))

# Sort uploads_list to deploy index.html, assets, and core UI first
def priority_key(item):
    local_path, remote_path = item
    if 'index.html' in remote_path:
        return 0
    if 'assets/' in remote_path:
        return 1
    if remote_path.endswith('.php') or remote_path.endswith('.htaccess'):
        return 2
    if 'audits/' in remote_path or 'exports/' in remote_path:
        return 4
    return 3

uploads_list.sort(key=priority_key)

import time

def upload_file(local_path, remote_rel_path):
    size = os.path.getsize(local_path)
    with open(local_path, 'rb') as f:
        file_bytes = f.read()

    target_url = f"{upload_base_url}/{remote_rel_path}?override=true"
    post_headers = {
        'X-Auth': auth_key,
        'X-Auth-Rest': rest_auth_key,
        'Tus-Resumable': '1.0.0',
        'Upload-Length': str(size),
        'Upload-Offset': '0'
    }

    for attempt in range(1, 4):
        try:
            r_post = requests.post(target_url, headers=post_headers, timeout=30)
            if r_post.status_code not in (200, 201):
                print(f"FAILED TUS POST {remote_rel_path}: {r_post.status_code} - {r_post.text}", flush=True)
                time.sleep(2)
                continue

            loc = r_post.headers.get('Location')
            if not loc:
                print(f"FAILED to get Location header for {remote_rel_path}", flush=True)
                time.sleep(2)
                continue
                
            if loc.startswith('http'):
                real_patch_url = loc
            elif loc.startswith('/'):
                real_patch_url = f"https://srv529-files.hstgr.io/rest{loc}"
            else:
                real_patch_url = f"https://srv529-files.hstgr.io/rest/{loc}"
            patch_headers = {
                'X-Auth': auth_key,
                'X-Auth-Rest': rest_auth_key,
                'Tus-Resumable': '1.0.0',
                'Content-Type': 'application/offset+octet-stream',
                'Upload-Offset': '0'
            }
            r_patch = requests.patch(real_patch_url, headers=patch_headers, data=file_bytes, timeout=45)
            print(f"Uploaded {remote_rel_path} ({size} bytes): status {r_patch.status_code}", flush=True)
            if r_patch.status_code in (200, 204):
                return True
            else:
                print(f"PATCH RETRY {remote_rel_path}: {r_patch.status_code}", flush=True)
                time.sleep(2)
        except Exception as e:
            print(f"Upload attempt {attempt} failed for {remote_rel_path}: {e}", flush=True)
            time.sleep(2)

    return False

success = True
for local, remote in uploads_list:
    if not upload_file(local, remote):
        print(f"Note: upload to {remote} skipped or errored, continuing remaining files...", flush=True)

print("Deployment complete.", flush=True)
