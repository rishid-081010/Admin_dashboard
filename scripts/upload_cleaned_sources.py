#!/usr/bin/env python3
"""
scripts/upload_cleaned_sources.py

High-performance parallel upload pipeline to upload all standardized cleaned CSV files
from `cleaned_sources_output/` to Supabase Storage bucket `dubai_real_estate` under `cleaned_sources/`.

Specifications:
- Bucket: dubai_real_estate
- Target folder: cleaned_sources/
- Authentication: Bearer SUPABASE_SERVICE_ROLE_KEY + apikey
- Upsert: x-upsert: true
- Concurrency: ThreadPoolExecutor(max_workers=16)
- Robust retry on network timeouts, connection errors, and 5xx/429 HTTP statuses
- Proper URL encoding and key sanitization for special characters (@, (, ), spaces, &, etc.)
"""

import os
import sys
import time
import json
import urllib.parse
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# Force UTF-8 stdout on Windows
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
CLEANED_DIR = BASE_DIR / "cleaned_sources_output"
MANIFEST_PATH = BASE_DIR / "upload_manifest.json"

DEFAULT_SUPABASE_URL = "https://qgxgtavkovqklijfpnfl.supabase.co"
TARGET_BUCKET = "dubai_real_estate"
TARGET_FOLDER = "cleaned_sources"
MAX_WORKERS = 16
MAX_RETRIES = 4
BACKOFF_FACTOR = 0.5


def load_env():
    """Load SUPABASE_SERVICE_ROLE_KEY and SUPABASE_URL from .env files with fallback."""
    env_paths = [
        BASE_DIR / ".env",
        BASE_DIR.parent / ".env.backend",
        BASE_DIR.parent / ".env",
    ]
    env_vars = {}
    for p in env_paths:
        if p.exists():
            try:
                content = p.read_text(encoding="utf-8", errors="replace")
                for line in content.splitlines():
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip("\"'")
                        if k not in env_vars:
                            env_vars[k] = v
            except Exception as e:
                print(f"Warning: Failed to parse {p}: {e}")

    service_key = env_vars.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    supabase_url = env_vars.get("SUPABASE_URL") or os.environ.get("SUPABASE_URL") or DEFAULT_SUPABASE_URL

    if not service_key:
        raise ValueError("SUPABASE_SERVICE_ROLE_KEY not found in .env files or environment!")

    return supabase_url.rstrip("/"), service_key


def sanitize_storage_key(filename: str) -> str:
    """
    Sanitize filename for Supabase Storage S3 key constraints.
    Supabase Storage rejects keys starting with '~' (Excel lock files) or containing U+FFFD.
    Original raw files in storage replaced '~' with '_-' and U+FFFD with '-'.
    """
    clean_name = filename
    if "\ufffd" in clean_name:
        clean_name = clean_name.replace("\ufffd", "-")
    if clean_name.startswith("~"):
        clean_name = "_-" + clean_name[1:]
    return clean_name


def create_session() -> requests.Session:
    """Create a requests session with connection pooling and retry adapter."""
    session = requests.Session()
    retry_strategy = Retry(
        total=MAX_RETRIES,
        backoff_factor=BACKOFF_FACTOR,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["POST", "PUT", "GET", "HEAD"]
    )
    adapter = HTTPAdapter(max_retries=retry_strategy, pool_connections=32, pool_maxsize=32)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session


def upload_single_file(file_path: Path, supabase_url: str, service_key: str, session: requests.Session) -> dict:
    """
    Upload a single CSV file to Supabase Storage with retries and timing.
    """
    orig_name = file_path.name
    storage_key = sanitize_storage_key(orig_name)
    quoted_key = urllib.parse.quote(storage_key)
    
    target_path = f"{TARGET_FOLDER}/{quoted_key}"
    upload_url = f"{supabase_url}/storage/v1/object/{TARGET_BUCKET}/{target_path}"
    public_url = f"{supabase_url}/storage/v1/object/public/{TARGET_BUCKET}/{TARGET_FOLDER}/{quoted_key}"

    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "x-upsert": "true",
        "Content-Type": "text/csv; charset=utf-8",
    }

    file_size = file_path.stat().st_size
    t0 = time.time()
    
    # Read binary content
    try:
        data = file_path.read_bytes()
    except Exception as e:
        return {
            "file": orig_name,
            "storage_key": storage_key,
            "status": "error",
            "status_code": 0,
            "size_bytes": file_size,
            "duration": round(time.time() - t0, 3),
            "public_url": public_url,
            "error": f"Read error: {str(e)}"
        }

    # Attempt upload with manual retry backoff if session retry isn't enough
    last_err = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = session.post(upload_url, headers=headers, data=data, timeout=60)
            if resp.status_code in [200, 201]:
                duration = round(time.time() - t0, 3)
                return {
                    "file": orig_name,
                    "storage_key": storage_key,
                    "status": "success",
                    "status_code": resp.status_code,
                    "size_bytes": file_size,
                    "duration": duration,
                    "public_url": public_url,
                    "error": None
                }
            elif resp.status_code in [500, 502, 503, 504, 429]:
                last_err = f"HTTP {resp.status_code}: {resp.text[:100]}"
                time.sleep(BACKOFF_FACTOR * (2 ** attempt))
            else:
                # Client error (4xx) - don't spin retries indefinitely
                return {
                    "file": orig_name,
                    "storage_key": storage_key,
                    "status": "error",
                    "status_code": resp.status_code,
                    "size_bytes": file_size,
                    "duration": round(time.time() - t0, 3),
                    "public_url": public_url,
                    "error": f"HTTP {resp.status_code}: {resp.text[:100]}"
                }
        except (requests.exceptions.RequestException, TimeoutError) as net_err:
            last_err = str(net_err)
            time.sleep(BACKOFF_FACTOR * (2 ** attempt))

    return {
        "file": orig_name,
        "storage_key": storage_key,
        "status": "error",
        "status_code": 0,
        "size_bytes": file_size,
        "duration": round(time.time() - t0, 3),
        "public_url": public_url,
        "error": f"Max retries exceeded: {last_err}"
    }


def main():
    t_start = time.time()
    print("=" * 80)
    print("     DUBAI REAL ESTATE CLEANED CSV STORAGE UPLOADER — MILESTONE 2")
    print("=" * 80)
    print(f"Working Directory: {BASE_DIR}")
    print(f"Cleaned CSVs Dir:  {CLEANED_DIR}")

    if not CLEANED_DIR.exists():
        print(f"ERROR: Cleaned directory does not exist: {CLEANED_DIR}")
        sys.exit(1)

    supabase_url, service_key = load_env()
    print(f"Supabase URL:      {supabase_url}")
    print(f"Bucket:            {TARGET_BUCKET}")
    print(f"Target Folder:     {TARGET_FOLDER}/")
    print(f"Service Role Key:  {service_key[:12]}...{service_key[-6:]}")
    print(f"Concurrency:       {MAX_WORKERS} workers")
    print("-" * 80)

    # Collect all CSV files from cleaned_sources_output
    csv_files = sorted(list(CLEANED_DIR.glob("*.csv")))
    total_files = len(csv_files)
    total_bytes = sum(f.stat().st_size for f in csv_files)
    print(f"Discovered {total_files} CSV files to upload ({total_bytes / (1024 * 1024):.2f} MB total).")

    if total_files == 0:
        print("No CSV files found in cleaned_sources_output!")
        sys.exit(1)

    # Pre-upload session per worker thread
    session = create_session()

    print(f"\nInitiating parallel upload with {MAX_WORKERS} workers...")
    results = []
    success_count = 0
    error_count = 0
    bytes_uploaded = 0

    def worker_task(file_path):
        return upload_single_file(file_path, supabase_url, service_key, session)

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        future_to_file = {executor.submit(worker_task, fp): fp for fp in csv_files}
        completed = 0

        for future in as_completed(future_to_file):
            completed += 1
            res = future.result()
            results.append(res)

            if res["status"] == "success":
                success_count += 1
                bytes_uploaded += res["size_bytes"]
            else:
                error_count += 1
                print(f"\n[UPLOAD ERROR] {res['file']} -> {res['error']}")

            if completed % 100 == 0 or completed == total_files:
                pct = (completed / total_files) * 100
                elapsed = time.time() - t_start
                rate = completed / elapsed if elapsed > 0 else 0
                mb_uploaded = bytes_uploaded / (1024 * 1024)
                print(f"[{completed:4d}/{total_files:4d}] {pct:5.1f}% | Success: {success_count} | Errors: {error_count} | Transferred: {mb_uploaded:.1f} MB | Rate: {rate:.1f} files/sec")

    total_duration = time.time() - t_start

    # Save manifest
    manifest_data = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_files": total_files,
        "success_count": success_count,
        "error_count": error_count,
        "total_bytes": total_bytes,
        "duration_seconds": round(total_duration, 2),
        "target_bucket": TARGET_BUCKET,
        "target_folder": TARGET_FOLDER,
        "uploads": results
    }

    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest_data, f, indent=2)

    print("\n" + "=" * 80)
    print("UPLOAD SUMMARY:")
    print(f"  Total Files Processed: {total_files}")
    print(f"  Successful (200/201):   {success_count} ({success_count/total_files*100:.1f}%)")
    print(f"  Failed (Errors):       {error_count}")
    print(f"  Total Data Uploaded:   {bytes_uploaded / (1024*1024):.2f} MB")
    print(f"  Elapsed Time:          {total_duration:.2f} seconds ({total_files/total_duration:.1f} files/sec)")
    print(f"  Manifest Saved:        {MANIFEST_PATH}")
    print("=" * 80)

    if error_count > 0:
        print(f"FAILED: {error_count} files failed to upload!")
        sys.exit(1)
    else:
        print("SUCCESS: 100% of files uploaded successfully!")
        sys.exit(0)


if __name__ == "__main__":
    main()
