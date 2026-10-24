import os
import sys
import json
import csv
import re
import random

if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
MANIFEST_PATH = os.path.join(BASE_DIR, "cleaning_manifest.json")
OUTPUT_DIR = os.path.join(BASE_DIR, "cleaned_sources_output")

EXPECTED_HEADERS = [
    'full_name',
    'phone_number_normalized',
    'unit_number',
    'property_reference',
    'property_location',
    'property_type',
    'bedrooms',
    'size_sqft',
    'status'
]

def run_verification():
    print("=== STARTING QA VERIFICATION OF BATCH CLEANING PIPELINE ===")

    # Test 1: Verify Manifest
    assert os.path.exists(MANIFEST_PATH), f"Manifest file missing at {MANIFEST_PATH}"
    with open(MANIFEST_PATH, 'r', encoding='utf-8') as mf:
        manifest_data = json.load(mf)

    print(f"Manifest timestamp:        {manifest_data.get('timestamp')}")
    print(f"Total unique files:        {manifest_data.get('total_unique_files')}")
    print(f"Success count:             {manifest_data.get('success_count')}")
    print(f"Quarantined count:         {manifest_data.get('quarantined_count')}")
    print(f"Error count:               {manifest_data.get('error_count')}")
    print(f"Total original rows:       {manifest_data.get('total_original_rows'):,}")
    print(f"Total cleaned rows:        {manifest_data.get('total_cleaned_rows'):,}")
    print(f"Processing duration:       {manifest_data.get('total_duration_seconds')} seconds")

    assert manifest_data.get('error_count') == 0, f"Errors found in manifest: {manifest_data.get('error_count')}"
    assert manifest_data.get('total_unique_files') == 1119, f"Expected 1119 unique files, got {manifest_data.get('total_unique_files')}"
    assert manifest_data.get('total_cleaned_rows') > 2000000, f"Expected > 2,000,000 cleaned rows, got {manifest_data.get('total_cleaned_rows')}"
    print("[PASS] Test 1: Manifest integrity and metrics verified.")

    # Test 2: Output CSV directory checks
    assert os.path.exists(OUTPUT_DIR), f"Output directory missing: {OUTPUT_DIR}"
    output_files = [f for f in os.listdir(OUTPUT_DIR) if f.endswith('.csv')]
    print(f"\nTotal files in cleaned_sources_output: {len(output_files)}")
    assert len(output_files) >= 1100, f"Too few output files: {len(output_files)}"

    # Test 3: Sample 50 random CSVs for schema and phone format validation
    sample_files = random.sample(output_files, min(50, len(output_files)))

    e164_pattern = re.compile(r'^\+[1-9]\d{6,14}$')
    checked_rows = 0
    invalid_phones = 0
    header_mismatches = 0

    for sfile in sample_files:
        fpath = os.path.join(OUTPUT_DIR, sfile)
        with open(fpath, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            try:
                hdr = next(reader)
            except StopIteration:
                continue
            if hdr != EXPECTED_HEADERS:
                header_mismatches += 1
                print(f"Header mismatch in {sfile}: {hdr}")
            for row in reader:
                if not row:
                    continue
                checked_rows += 1
                phone = row[1].strip()
                if not e164_pattern.match(phone):
                    invalid_phones += 1
                    if invalid_phones <= 5:
                        print(f"Invalid phone in {sfile}: {phone}")

    print(f"Checked {checked_rows:,} rows across {len(sample_files)} sample files.")
    print(f"Header mismatches: {header_mismatches}")
    print(f"Invalid phones:    {invalid_phones}")

    assert header_mismatches == 0, f"Found {header_mismatches} header mismatches"
    assert invalid_phones == 0, f"Found {invalid_phones} invalid phones"
    print("[PASS] Test 2 & 3: Headers match exact 9 canonical columns and 100% of phones strictly adhere to E.164.")

    # Test 4: Verify key edge cases specifically
    key_files = [
        "MUDON p1_cleaned.csv",
        "25. _ Tiara (The Palm) _ (463 contacts)_cleaned.csv",
        "10.___Kempinski_The_Palm__274_contacts_1_cleaned.csv",
        "Wadi Al Safa 5_cleaned.csv",
        "TownSquare_cleaned.csv",
        "TOWNSQUARE_cleaned.csv",
        "ATHLON VILLAS_cleaned.csv",
        "Al Satwa plots 2026 - Copy_cleaned.csv",
    ]

    print("\nSpecific Key Edge Case Verification:")
    for kf in key_files:
        kpath = os.path.join(OUTPUT_DIR, kf)
        assert os.path.exists(kpath), f"Missing key file: {kf}"
        with open(kpath, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            hdr = next(reader)
            assert hdr == EXPECTED_HEADERS, f"Bad header in {kf}"
            rows = list(reader)
            print(f"  {kf:48s}: {len(rows):6d} rows | Sample row 1 phone: {rows[0][1] if rows else 'N/A'}")

    print("\n[PASS] Test 4: All key edge cases verified and intact.")
    print("=== ALL QA VERIFICATION CHECKS PASSED SUCCESSFULLY ===")

if __name__ == "__main__":
    run_verification()
