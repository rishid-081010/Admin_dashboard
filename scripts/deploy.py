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
payload = {'username': 'u292760294', 'domain': 'admin.asquared.ae'}
print("Requesting upload URL for admin.asquared.ae...")
r = requests.post(gen_url, headers=gen_headers, json=payload, timeout=30)
if r.status_code != 200:
    print("Error connecting to Hostinger API:", r.text)
    sys.exit(1)

data = r.json()
upload_base_url = data['url']
auth_key = data['auth_key']
rest_auth_key = data['rest_auth_key']

dist_dir = 'client/dist'
if not os.path.exists(dist_dir):
    print(f"Error: {dist_dir} does not exist. Did you run npm run build?")
    sys.exit(1)

files_to_upload = {}
for root, _, files in os.walk(dist_dir):
    for file in files:
        local_path = os.path.join(root, file)
        # Convert path to posix format for URL
        rel_path = os.path.relpath(local_path, dist_dir).replace('\\\\', '/').replace('\\', '/')
        remote_rel_path = f"public/dashboard/{rel_path}"
        files_to_upload[local_path] = remote_rel_path

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
    r_post = requests.post(target_url, headers=post_headers, timeout=20)
    if r_post.status_code not in (200, 201):
        print(f"FAILED TUS POST {remote_rel_path}: {r_post.status_code} - {r_post.text}")
        return False

    loc = r_post.headers.get('Location')
    if not loc:
        print(f"FAILED to get Location header for {remote_rel_path}")
        return False
        
    real_patch_url = f"https://srv529-files.hstgr.io/rest{loc}"
    patch_headers = {
        'X-Auth': auth_key,
        'X-Auth-Rest': rest_auth_key,
        'Tus-Resumable': '1.0.0',
        'Content-Type': 'application/offset+octet-stream',
        'Upload-Offset': '0'
    }
    r_patch = requests.patch(real_patch_url, headers=patch_headers, data=file_bytes, timeout=30)
    print(f"Uploaded {remote_rel_path} ({size} bytes): status {r_patch.status_code}")
    return r_patch.status_code in (200, 204)

success = True
for local, remote in files_to_upload.items():
    if not upload_file(local, remote):
        success = False

if not success:
    sys.exit(1)
print("Deployment complete.")
