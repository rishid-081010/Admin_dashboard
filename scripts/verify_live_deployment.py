#!/usr/bin/env python3
"""
scripts/verify_live_deployment.py

Verify live production deployment on Hostinger:
- Verify HTTP 200 responses from required production domains:
  * https://dashboard.asquared.ae/
  * https://admin.asquared.ae/
- Verify that the updated SourcesDirectory chunk is serving correctly with HTTP 200
  and contains both "Original (Raw)" and "Cleaned (CSV)" download options.
"""

import sys
import requests

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

required_endpoints = [
    ("https://dashboard.asquared.ae/", "Dashboard Portal Root"),
    ("https://admin.asquared.ae/", "Admin Portal Root"),
    ("https://dashboard.asquared.ae/assets/SourcesDirectory-Cvk6M0Ir.js", "Dashboard SourcesDirectory Chunk"),
    ("https://admin.asquared.ae/assets/SourcesDirectory-Cvk6M0Ir.js", "Admin SourcesDirectory Chunk"),
]

headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Cache-Control": "no-cache"
}

print("=" * 80)
print("       HOSTINGER LIVE PRODUCTION DEPLOYMENT VERIFICATION")
print("=" * 80)

all_passed = True

for url, description in required_endpoints:
    try:
        r = requests.get(url, headers=headers, timeout=20)
        status = r.status_code
        size = len(r.content)
        if status == 200:
            print(f"[PASS] {status} OK  | {size:>8} bytes | {description} ({url})")
        else:
            print(f"[FAIL] {status} ERR | {size:>8} bytes | {description} ({url})")
            all_passed = False

        if "SourcesDirectory" in url and status == 200:
            text = r.text
            has_raw = "Original (Raw)" in text
            has_cleaned = "Cleaned (CSV)" in text
            print(f"       ✓ Contains 'Original (Raw)': {has_raw}")
            print(f"       ✓ Contains 'Cleaned (CSV)':  {has_cleaned}")
            if not (has_raw and has_cleaned):
                all_passed = False
                print("       [FAIL] Missing required action labels in live chunk!")
    except Exception as e:
        print(f"[FAIL] Exception accessing {url}: {e}")
        all_passed = False

print("-" * 80)
if all_passed:
    print("ALL MANDATORY LIVE PRODUCTION ENDPOINTS VERIFIED SUCCESSFULLY (HTTP 200 OK)!")
    sys.exit(0)
else:
    print("SOME MANDATORY LIVE ENDPOINT CHECKS FAILED!")
    sys.exit(1)
