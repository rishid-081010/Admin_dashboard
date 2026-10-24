#!/usr/bin/env python3
"""
scripts/update_sources_data.py

Updates `client/src/data/sourcesData.js` by extending every record in `SOURCES_DATA` (all 1,382 entries)
with:
  - cleaned_filename: <clean_base_name>_cleaned.csv
  - cleaned_url: https://qgxgtavkovqklijfpnfl.supabase.co/storage/v1/object/public/dubai_real_estate/cleaned_sources/<encoded_filename>

Maintains 100% syntactical validity, preserves all existing fields, and guarantees proper encoding
for special characters (@, (, ), spaces, etc.).
"""

import re
import json
import urllib.parse
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
SOURCES_DATA_JS = BASE_DIR / "client" / "src" / "data" / "sourcesData.js"
BASE_PUBLIC_URL = "https://qgxgtavkovqklijfpnfl.supabase.co/storage/v1/object/public/dubai_real_estate/cleaned_sources"


def sanitize_base_name(filename: str) -> str:
    """
    Strips extension and applies sanitization for S3 key storage compatibility.
    """
    clean_base = re.sub(r'\.(xlsx|xls)$', '', filename, flags=re.I)
    if "\ufffd" in clean_base:
        clean_base = clean_base.replace("\ufffd", "-")
    if clean_base.startswith("~"):
        clean_base = "_-" + clean_base[1:]
    return clean_base


def update_sources_data():
    if not SOURCES_DATA_JS.exists():
        raise FileNotFoundError(f"Cannot find {SOURCES_DATA_JS}")

    raw_text = SOURCES_DATA_JS.read_text(encoding="utf-8")
    
    # Locate array boundary
    start_bracket = raw_text.find("[")
    end_bracket = raw_text.rfind("]")
    if start_bracket == -1 or end_bracket == -1:
        raise ValueError("Could not find array boundaries '[' and ']' in sourcesData.js")

    json_str = raw_text[start_bracket : end_bracket + 1]
    entries = json.loads(json_str)

    print(f"Loaded {len(entries)} catalog records from sourcesData.js.")

    updated_entries = []
    for entry in entries:
        filename = entry.get("filename", "")
        clean_base = sanitize_base_name(filename)
        cleaned_filename = f"{clean_base}_cleaned.csv"
        encoded_filename = urllib.parse.quote(cleaned_filename)
        cleaned_url = f"{BASE_PUBLIC_URL}/{encoded_filename}"

        # Insert fields right after download_url (or at end of object)
        new_entry = {}
        for k, v in entry.items():
            new_entry[k] = v
            if k == "download_url":
                new_entry["cleaned_filename"] = cleaned_filename
                new_entry["cleaned_url"] = cleaned_url

        if "cleaned_filename" not in new_entry:
            new_entry["cleaned_filename"] = cleaned_filename
            new_entry["cleaned_url"] = cleaned_url

        updated_entries.append(new_entry)

    # Format output JS
    formatted_json = json.dumps(updated_entries, indent=2, ensure_ascii=False)
    new_content = f"// Real raw vendor source files metadata (1382 files)\nexport const SOURCES_DATA = {formatted_json};\n"

    SOURCES_DATA_JS.write_text(new_content, encoding="utf-8")
    print(f"Successfully updated all {len(updated_entries)} records in {SOURCES_DATA_JS}.")

    # Quick spot-check validation
    sample = updated_entries[0]
    print(f"\nSpot check entry 1:")
    print(f"  filename:         {sample['filename']}")
    print(f"  download_url:     {sample['download_url']}")
    print(f"  cleaned_filename: {sample['cleaned_filename']}")
    print(f"  cleaned_url:      {sample['cleaned_url']}")

    edge_case = next(e for e in updated_entries if "Tiara" in e["filename"])
    print(f"\nSpot check Tiara edge case:")
    print(f"  filename:         {edge_case['filename']}")
    print(f"  cleaned_filename: {edge_case['cleaned_filename']}")
    print(f"  cleaned_url:      {edge_case['cleaned_url']}")


if __name__ == "__main__":
    update_sources_data()
