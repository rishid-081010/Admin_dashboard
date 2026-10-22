import requests
import os
import sys
import time

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

# Deploy to both subdomains to ensure zero drift
target_domains = ['admin.asquared.ae', 'dashboard.asquared.ae']

dist_dir = 'client/dist'
if not os.path.exists(dist_dir):
    print(f"Error: {dist_dir} does not exist. Did you run npm run build?")
    sys.exit(1)

root_dir = 'root_files'

def get_upload_credentials(domain):
    payload = {'username': 'u292760294', 'domain': domain}
    print(f"Requesting upload URL for {domain}...")
    for attempt in range(1, 4):
        try:
            res = requests.post(gen_url, headers=gen_headers, json=payload, timeout=30)
            if res.status_code == 200:
                print(f"✓ Obtained upload URL for {domain}")
                data = res.json()
                return data['url'], data['auth_key'], data['rest_auth_key']
            print(f"Attempt {attempt} for {domain}: Hostinger API returned {res.status_code}: {res.text}. Retrying in {attempt * 2}s...")
        except Exception as e:
            print(f"Attempt {attempt} for {domain}: Exception: {e}. Retrying in {attempt * 2}s...")
        time.sleep(attempt * 2)
    return None, None, None

def deploy_to_domain(domain):
    upload_base_url, auth_key, rest_auth_key = get_upload_credentials(domain)
    if not upload_base_url:
        print(f"Warning: Could not get upload credentials for {domain}, skipping.")
        return False

    print(f"\n--- Deploying assets to {domain} ---")
    uploads_list = []

    for root, _, files in os.walk(dist_dir):
        for file in files:
            local_path = os.path.join(root, file)
            rel_path = os.path.relpath(local_path, dist_dir).replace('\\\\', '/').replace('\\', '/')
            
            if domain == 'dashboard.asquared.ae':
                # Direct root for dashboard subdomain
                uploads_list.append((local_path, rel_path))
                uploads_list.append((local_path, f"public/{rel_path}"))
            else:
                # admin subdomain mirrors
                uploads_list.append((local_path, f"public/dashboard/{rel_path}"))
                uploads_list.append((local_path, f"dashboard/{rel_path}"))
                uploads_list.append((local_path, f"public/admin/{rel_path}"))
                uploads_list.append((local_path, f"admin/{rel_path}"))
                uploads_list.append((local_path, f"public/{rel_path}"))
                uploads_list.append((local_path, rel_path))

    # Add root_files for server APIs
    if os.path.exists(root_dir):
        for r_dir, _, r_files in os.walk(root_dir):
            for f in r_files:
                lpath = os.path.join(r_dir, f)
                rel_f = os.path.relpath(lpath, root_dir).replace('\\', '/')
                if rel_f in ('index.html', 'index.php') and domain == 'dashboard.asquared.ae':
                    continue # Do not overwrite React index.html on dashboard
                uploads_list.append((lpath, rel_f))
                uploads_list.append((lpath, f"public/{rel_f}"))

    # Priority sorting
    def priority_key(item):
        _, remote_path = item
        if 'index.html' in remote_path:
            return 0
        if 'assets/' in remote_path:
            return 1
        if remote_path.endswith('.php') or remote_path.endswith('.htaccess'):
            return 2
        return 3

    uploads_list.sort(key=priority_key)

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
                    time.sleep(1)
                    continue

                loc = r_post.headers.get('Location')
                if not loc:
                    time.sleep(1)
                    continue
                    
                real_patch_url = loc if loc.startswith('http') else f"https://srv529-files.hstgr.io/rest{loc}"
                patch_headers = {
                    'X-Auth': auth_key,
                    'X-Auth-Rest': rest_auth_key,
                    'Tus-Resumable': '1.0.0',
                    'Content-Type': 'application/offset+octet-stream',
                    'Upload-Offset': '0'
                }
                r_patch = requests.patch(real_patch_url, headers=patch_headers, data=file_bytes, timeout=45)
                if r_patch.status_code in (200, 204):
                    print(f"  ✓ {remote_rel_path} ({size} B)", flush=True)
                    return True
                time.sleep(1)
            except Exception as e:
                time.sleep(1)

        print(f"  ✗ Failed {remote_rel_path}", flush=True)
        return False

    success_count = 0
    for local, remote in uploads_list:
        if upload_file(local, remote):
            success_count += 1

    print(f"✓ Deployed {success_count}/{len(uploads_list)} files to {domain}", flush=True)
    return True

for d in target_domains:
    deploy_to_domain(d)

print("\nDeployment complete across all subdomains.", flush=True)
