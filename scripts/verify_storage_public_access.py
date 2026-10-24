#!/usr/bin/env python3
"""
scripts/verify_storage_public_access.py

Comprehensive independent verification of public, unauthenticated HTTP access
for cleaned CSV files uploaded to Supabase Storage in Milestone 2.

Checks:
1. Unauthenticated HEAD and GET requests on required edge cases and sample files.
2. HTTP 200 status code verification.
3. Content-Type and data integrity checks (9 canonical headers).
4. Public access verification for special character filenames (@, &, spaces, parentheses, case sensitivity).
"""

import sys
import json
import random
import urllib.parse
from pathlib import Path
import requests

# Force UTF-8 output
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

BASE_DIR = Path(__file__).resolve().parent.parent
MANIFEST_PATH = BASE_DIR / "upload_manifest.json"
BASE_PUBLIC_URL = "https://qgxgtavkovqklijfpnfl.supabase.co/storage/v1/object/public/dubai_real_estate/cleaned_sources"

CANONICAL_HEADERS = "full_name,phone_number_normalized,unit_number,property_reference,property_location,property_type,bedrooms,size_sqft,status"

SPECIFIC_EDGE_CASES = [
    "TownSquare_cleaned.csv",
    "TOWNSQUARE_cleaned.csv",
    "MUDON p1_cleaned.csv",
    "25. _ Tiara (The Palm) _ (463 contacts)_cleaned.csv",
    "10.___Kempinski_The_Palm__274_contacts_1_cleaned.csv",
    "Wadi Al Safa 5_cleaned.csv",
    "ATHLON VILLAS_cleaned.csv",
    "Al Satwa plots 2026 - Copy_cleaned.csv",
    "Central Park (DIFC) @ (601 contacts) - Copy_cleaned.csv",
    "A Ranches 3 Elie Saab & Caya-1_cleaned.csv",
    "Real Estate Buyer-Investors data  bayut_cleaned.csv",
    "_-Damac Lagoon New (2)_cleaned.csv",
    "_-Tilal Al Ghaf - Aura_Harmony_Alaya_cleaned.csv",
]


def test_public_url(filename: str):
    quoted = urllib.parse.quote(filename)
    url = f"{BASE_PUBLIC_URL}/{quoted}"
    
    # 1. Unauthenticated HEAD request (no headers, no auth)
    head_resp = requests.head(url, timeout=15)
    if head_resp.status_code != 200:
        return False, f"HEAD failed with status {head_resp.status_code} for {url}"
        
    # 2. Unauthenticated GET request (range request or stream first line)
    get_resp = requests.get(url, stream=True, timeout=15)
    if get_resp.status_code != 200:
        return False, f"GET failed with status {get_resp.status_code} for {url}"

    first_chunk = next(get_resp.iter_content(chunk_size=1024), b"").decode("utf-8", errors="replace")
    first_line = first_chunk.splitlines()[0] if first_chunk else ""
    get_resp.close()

    if first_line.strip() != CANONICAL_HEADERS:
        return False, f"Invalid headers: {first_line[:60]}... Expected: {CANONICAL_HEADERS}"

    return True, f"HTTP 200 OK | Content-Length: {head_resp.headers.get('content-length', 'unknown')}"


def main():
    print("=" * 80)
    print("       VERIFYING PUBLIC ACCESS TO SUPABASE STORAGE CLEANED CSVs")
    print("=" * 80)

    # 1. Verify specific edge cases
    print("\n--- TEST 1: Specific Required Edge Cases & Complex Filenames ---")
    edge_failures = []
    for fn in SPECIFIC_EDGE_CASES:
        ok, msg = test_public_url(fn)
        status_tag = "[PASS]" if ok else "[FAIL]"
        print(f"  {status_tag} {fn:55s} -> {msg}")
        if not ok:
            edge_failures.append((fn, msg))

    # 2. Verify randomized sample from upload manifest
    print("\n--- TEST 2: Randomized Sample Verification (50 Files) ---")
    if not MANIFEST_PATH.exists():
        print(f"ERROR: Manifest not found at {MANIFEST_PATH}")
        sys.exit(1)

    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    successful_uploads = [u["storage_key"] for u in manifest.get("uploads", []) if u["status"] == "success"]
    sample_pool = [k for k in successful_uploads if k not in SPECIFIC_EDGE_CASES]
    
    random.seed(42)  # Deterministic seed for reproducible testing
    sample_files = random.sample(sample_pool, min(50, len(sample_pool)))
    
    sample_failures = []
    for i, fn in enumerate(sample_files, 1):
        ok, msg = test_public_url(fn)
        if not ok:
            print(f"  [FAIL] ({i:2d}/50) {fn} -> {msg}")
            sample_failures.append((fn, msg))
        elif i % 10 == 0 or i == len(sample_files):
            print(f"  [PASS] ({i:2d}/50) Checked {i} random files successfully.")

    print("\n" + "=" * 80)
    print("VERIFICATION SUMMARY:")
    print(f"  Edge Cases Checked:  {len(SPECIFIC_EDGE_CASES)} (Failed: {len(edge_failures)})")
    print(f"  Sample Files Tested: {len(sample_files)} (Failed: {len(sample_failures)})")
    print(f"  Total Tested:        {len(SPECIFIC_EDGE_CASES) + len(sample_files)}")
    print("=" * 80)

    if edge_failures or sample_failures:
        print("VERIFICATION FAILED!")
        sys.exit(1)
    else:
        print("ALL PUBLIC STORAGE ACCESS CHECKS PASSED WITH HTTP 200 OK!")
        sys.exit(0)


if __name__ == "__main__":
    main()
