import requests
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor

# Force UTF-8 stdout and stderr on Windows
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
if hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass


token = os.environ.get('HOSTINGER_TOKEN')
if not token:
    for env_path in ['.env', '../.env', '../.env.backend']:
        if os.path.exists(env_path):
            try:
                with open(env_path, 'r', encoding='latin-1') as ef:
                    for line in ef:
                        line = line.strip()
                        if line.startswith('HOSTINGER_TOKEN='):
                            token = line.split('=', 1)[1].strip().strip('"\'')
                            break
            except Exception:
                pass
        if token:
            break

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
target_domains = ['admin.asquared.ae', 'asquared.ae', 'dashboard.asquared.ae']

dist_dir = 'client/dist'
if not os.path.exists(dist_dir):
    print(f"Error: {dist_dir} does not exist. Did you run npm run build[OK]")
    sys.exit(1)

root_dir = 'root_files'

def get_upload_credentials(domain):
    payload = {'username': 'u292760294', 'domain': domain}
    print(f"Requesting upload URL for {domain}...")
    for attempt in range(1, 4):
        try:
            res = requests.post(gen_url, headers=gen_headers, json=payload, timeout=(10, 30))
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
    uploads_set = set()

    for root, _, files in os.walk(dist_dir):
        for file in files:
            local_path = os.path.join(root, file)
            rel_path = os.path.relpath(local_path, dist_dir).replace('\\\\', '/').replace('\\', '/')
            
            # Subdomain root and /dashboard/ paths
            uploads_set.add((local_path, rel_path))
            uploads_set.add((local_path, f"dashboard/{rel_path}"))
            uploads_set.add((local_path, f"public/{rel_path}"))
            uploads_set.add((local_path, f"public/dashboard/{rel_path}"))
            if domain == 'admin.asquared.ae':
                uploads_set.add((local_path, f"admin/{rel_path}"))

    # Add root_files for server APIs
    if os.path.exists(root_dir):
        for r_dir, _, r_files in os.walk(root_dir):
            for f in r_files:
                lpath = os.path.join(r_dir, f)
                rel_f = os.path.relpath(lpath, root_dir).replace('\\', '/')
                if rel_f in ('index.html', 'index.php'):
                    if domain != 'dashboard.asquared.ae':
                        uploads_set.add((lpath, rel_f))
                    continue # Do not overwrite React index.html on dashboard
                uploads_set.add((lpath, rel_f))
                uploads_set.add((lpath, f"dashboard/{rel_f}"))
                uploads_set.add((lpath, f"public/{rel_f}"))

    uploads_list = list(uploads_set)

    # Priority sorting: index.html & index-*.js first
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
    total_files = len(uploads_list)
    print(f"Total targets to deploy to {domain}: {total_files}")

    def upload_file(item):
        local_path, remote_rel_path = item
        size = os.path.getsize(local_path)
        with open(local_path, 'rb') as f:
            file_bytes = f.read()

        target_url = f"{upload_base_url}/{remote_rel_path}[OK]override=true"
        post_headers = {
            'X-Auth': auth_key,
            'X-Auth-Rest': rest_auth_key,
            'Tus-Resumable': '1.0.0',
            'Upload-Length': str(size),
            'Upload-Offset': '0'
        }

        for attempt in range(1, 4):
            try:
                r_post = requests.post(target_url, headers=post_headers, timeout=(10, 25))
                if r_post.status_code not in (200, 201):
                    time.sleep(0.5)
                    continue

                loc = r_post.headers.get('Location')
                if not loc:
                    time.sleep(0.5)
                    continue
                    
                real_patch_url = loc if loc.startswith('http') else f"https://srv529-files.hstgr.io/rest{loc}"
                patch_headers = {
                    'X-Auth': auth_key,
                    'X-Auth-Rest': rest_auth_key,
                    'Tus-Resumable': '1.0.0',
                    'Content-Type': 'application/offset+octet-stream',
                    'Upload-Offset': '0'
                }
                r_patch = requests.patch(real_patch_url, headers=patch_headers, data=file_bytes, timeout=(10, 35))
                if r_patch.status_code in (200, 204):
                    print(f"  ✓ {remote_rel_path} ({size} B)", flush=True)
                    return True
                time.sleep(0.5)
            except Exception:
                time.sleep(0.5)

        print(f"  ✗ Failed {remote_rel_path}", flush=True)
        return False

    success_count = 0
    # Concurrent pool of 6 workers
    with ThreadPoolExecutor(max_workers=6) as executor:
        results = executor.map(upload_file, uploads_list)
        for r in results:
            if r:
                success_count += 1

    print(f"✓ Successfully deployed {success_count}/{total_files} targets to {domain}", flush=True)
    return True

for d in target_domains:
    deploy_to_domain(d)

print("\nDeployment complete across all subdomains.", flush=True)
