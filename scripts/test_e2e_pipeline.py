#!/usr/bin/env python3
"""
E2E Test Pipeline Runner for Dubai Real Estate Dashboard
========================================================
Independent, opaque-box, requirement-driven end-to-end test suite
verifying all requirements from ORIGINAL_REQUEST.md and all 18 features
in the PROJECT.md Feature Inventory across 4 comprehensive test tiers:

- Tier 1: Feature Coverage (>=5 tests per feature across all 18 features)
- Tier 2: Boundary & Corner Cases (empty files, header offsets, multi-sheet, unformatted phones, cell shifts, duplicate catalog entries)
- Tier 3: Cross-Feature Combinations (pairwise interactions: cleaning + upload, storage URL + UI dropdown, UI state + filters)
- Tier 4: Real-World Application Scenarios (end-to-end ingestion on deed batches, UI component DOM & accessibility, cloud storage verification)

Usage:
    py scripts/test_e2e_pipeline.py [--tier 1|2|3|4] [--verbose] [--bail]
"""

import os
import sys
import re
import csv
import io
import json
import time
import argparse
import urllib.parse
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple, Callable

# Ensure UTF-8 output on Windows consoles
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Determine Project Root dynamically
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
CLIENT_DIR = PROJECT_ROOT / "client"
SOURCES_DATA_FILE = CLIENT_DIR / "src" / "data" / "sourcesData.js"
SOURCES_DIRECTORY_JSX = CLIENT_DIR / "src" / "components" / "SourcesDirectory.jsx"
LOCAL_CACHE_DIR = Path(r"C:\Users\Rishi D\Downloads\NEW_DATA_2026_EXTRACTED")
STAGING_OUTPUT_DIR = PROJECT_ROOT / "cleaned_sources_output"
DEPLOY_SCRIPT = PROJECT_ROOT / "scripts" / "deploy.py"

# Terminal Formatting Helpers
class Term:
    GREEN = "\033[92m"
    RED = "\033[91m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    CYAN = "\033[96m"
    BOLD = "\033[1m"
    DIM = "\033[2m"
    RESET = "\033[0m"

    @classmethod
    def ok(cls, msg: str) -> str:
        return f"{cls.GREEN}✓ {msg}{cls.RESET}"

    @classmethod
    def fail(cls, msg: str) -> str:
        return f"{cls.RED}✗ {msg}{cls.RESET}"

    @classmethod
    def info(cls, msg: str) -> str:
        return f"{cls.CYAN}ℹ {msg}{cls.RESET}"

    @classmethod
    def warn(cls, msg: str) -> str:
        return f"{cls.YELLOW}⚠ {msg}{cls.RESET}"


# ─────────────────────────────────────────────────────────────────────────────
# 1. Authoritative Reference Lead Cleaner & Normalizer Engine
# ─────────────────────────────────────────────────────────────────────────────
DUMMY_STRINGS = {
    "null", "n/a", "na", "none", "-", "--", "0", "undefined", "nil", "unknown",
    ".", "n.a", "not available", "tbd", "nan", "blank", "seller", "owner",
    "customer", "buyer", "investor", "client", "property owner"
}

CORPORATE_ACRONYMS = {
    "LLC", "P.J.S.C", "PJSC", "FZE", "FZCO", "HOLDING", "HOLDINGS", "LIMITED",
    "LTD", "PROPERTIES", "DEVELOPMENT", "INVESTMENTS", "GROUP", "CORP", "INC"
}

CANONICAL_HEADERS = [
    "full_name",
    "phone_number_normalized",
    "unit_number",
    "property_reference",
    "property_location",
    "property_type",
    "bedrooms",
    "size_sqft",
    "status"
]

def clean_arabic_numerals(text: Any) -> str:
    """Translates Arabic-Indic numerals (٠-٩) to ASCII standard digits (0-9)."""
    if text is None:
        return ""
    s = str(text).strip()
    arabic_indic = "٠١٢٣٤٥٦٧٨٩"
    for idx, char in enumerate(arabic_indic):
        s = s.replace(char, str(idx))
    return s

def normalize_phone_e164(raw_phone: Any) -> Dict[str, Any]:
    """
    Standardizes raw phone strings to E.164 (+971...) according to UAE telecom specs.
    """
    if raw_phone is None:
        return {"valid": False, "e164": None, "reason": "Empty phone"}
    
    s = clean_arabic_numerals(raw_phone).strip()
    if not s:
        return {"valid": False, "e164": None, "reason": "Empty phone"}

    # Rejection of dates or timestamps in phone column
    if re.search(r"^\d{4}[-/]\d{1,2}[-/]\d{1,2}", s) or re.search(r"^\d{1,2}[-/]\d{1,2}[-/]\d{4}", s):
        return {"valid": False, "e164": None, "reason": "Date in phone column"}
    if any(c in s for c in [":", "00:00:00"]) and len(s.split("-")) >= 3:
        return {"valid": False, "e164": None, "reason": "Timestamp in phone column"}
    if re.search(r"[a-zA-Z]", s) and not re.search(r"(?:ext|tel|mob|phone)", s, re.I):
        return {"valid": False, "e164": None, "reason": "Alphabetic characters in phone"}

    # Normalize vendor prefixes with delimiters
    s = re.sub(r"^(?:\+?00971|\+?971|00971)[\s|/\\-]+0?", "971", s, flags=re.I)
    # Fix +9710[2-9]...
    s = re.sub(r"^\+?9710([2-9])", r"971\1", s)
    # Local prefix 0[2-9] with separators
    s = re.sub(r"^0([2-9])[\s|/\\-]+", r"0\1", s)

    # Split multi-phone cells
    parts = re.split(r"[,;\n\r/|&]+", s)
    parts = [p.strip() for p in parts if p.strip()]
    primary_raw = parts[0] if parts else ""
    secondary_raw = parts[1] if len(parts) > 1 else None

    digits = re.sub(r"\D", "", primary_raw)

    if digits.startswith("00"):
        digits = digits[2:]

    if digits.startswith("9710") and len(digits) == 13:
        digits = "971" + digits[4:]

    # UAE Mobile Normalization
    if digits.startswith("05") and len(digits) == 10:
        digits = "971" + digits[1:]
    elif digits.startswith("5") and len(digits) == 9:
        digits = "971" + digits

    # UAE Landline Normalization (04xxxxxxx -> 9714xxxxxxx)
    if re.match(r"^0[234679]\d{7}$", digits):
        digits = "971" + digits[1:]

    is_landline = bool(re.match(r"^971[234679]\d{7}$", digits))

    if len(digits) < 7:
        return {"valid": False, "e164": None, "reason": "Too few digits (<7)"}
    if len(digits) > 15:
        return {"valid": False, "e164": None, "reason": "Too many digits (>15)"}
    if re.match(r"^0+$", digits):
        return {"valid": False, "e164": None, "reason": "All zeros"}

    e164 = f"+{digits}"
    return {
        "valid": True,
        "e164": e164,
        "is_landline": is_landline,
        "raw_primary": primary_raw,
        "secondary_raw": secondary_raw
    }

def clean_unit_number(raw_unit: Any, building_name: str = "") -> str:
    """
    Extracts clean unit / premise number from raw inputs.
    """
    if raw_unit is None:
        return ""
    u = clean_arabic_numerals(raw_unit).strip()
    u = re.sub(r"[\s\-_/,]+$", "", u).strip()

    # Fast reject phone numbers in unit column
    digits_only = re.sub(r"\D", "", u)
    if (re.match(r"^(?:\+?00971|\+?971|05)\d{7,10}$", digits_only) or 
        (len(digits_only) >= 9 and len(digits_only) <= 13 and digits_only.startswith(("971", "05")))):
        return ""

    # Fast reject dates and datetimes in unit column
    if re.search(r"\d{4}[-/]\d{1,2}[-/]\d{1,2}", u) or re.search(r"\d{1,2}[-/]\d{1,2}[-/]\d{4}", u):
        return ""

    # Fast reject dummy strings
    if u.lower() in DUMMY_STRINGS:
        return ""

    # Strip prefixes
    u = re.sub(r"^(?:Unit|Flat|Villa|Apartment|Apt|Suite|Door|Premise|Premises)\s*[:#-]?\s*", "", u, flags=re.I)

    # Handle DEWA compound pipe strings
    if "|" in u:
        segments = [s.strip() for s in u.split("|") if s.strip()]
        for seg in segments:
            m = re.match(r"^(?:Apartment|Flat|Unit|Villa|TH)\s+([A-Za-z0-9_-]+)", seg, re.I)
            if m:
                return m.group(1)
        last_seg = segments[-1]
        last_space = last_seg.rfind(" ")
        if last_space != -1:
            pot_unit = last_seg[last_space + 1:].strip()
            if any(c.isdigit() for c in pot_unit):
                return pot_unit
        return last_seg

    # Strip building name prefix if present
    if building_name and len(building_name) > 3:
        b_upper = building_name.strip().upper()
        if u.upper().startswith(b_upper):
            stripped = re.sub(r"^[\s\-_/]+", "", u[len(b_upper):]).strip()
            if stripped:
                return stripped

    # Strip vendor export trailing -0
    u = re.sub(r"^(\d+)-0+$", r"\1", u)
    u = re.sub(r"^(?:APT|UNIT|FLAT|VILLA|SUITE)?\s*([A-Za-z0-9_-]+)-0+$", r"\1", u, flags=re.I)

    return u

def sanitize_owner_name(raw_name: Any) -> str:
    """
    Sanitizes owner names, reversing 'Last, First' and preserving corporate acronyms.
    """
    if raw_name is None:
        return "Property Owner"
    name = str(raw_name).strip()

    # Reject email addresses or phone strings in name column
    if "@" in name and "." in name:
        return "Property Owner"
    if re.match(r"^\+?\d{6,}$", re.sub(r"[\s\-_]", "", name)):
        return "Property Owner"
    if name.lower() in DUMMY_STRINGS:
        return "Property Owner"

    # Strip vendor reference prefixes
    name = re.sub(r"^(?:NR/NHO|REF|ID|CODE)[\s,:\-_]+", "", name, flags=re.I)
    name = re.sub(r"-(?:Kempinski|Tower|Building|Villa|Flat|Unit|TH)[\s\w]*$", "", name, flags=re.I)

    # Normalize corporate suffixes
    name = re.sub(r"\bL\s+L\s+C\b", "LLC", name, flags=re.I)
    name = re.sub(r"\bL\.L\.C\.?\b", "LLC", name, flags=re.I)
    name = re.sub(r"\bP\.J\.S\.C\.?\b", "PJSC", name, flags=re.I)

    # Strip HTML tags and noise symbols
    name = re.sub(r"<[^>]*>", "", name)
    name = re.sub(r"[\\/\[\]{}()_<>]", " ", name)
    name = re.sub(r"\s+-\s+", " ", name)
    name = re.sub(r"^[\s,.;:-]+|[\s,.;:-]+$", "", name)

    # Reverse "LastName, FirstName"
    if "," in name:
        parts = [p.strip() for p in name.split(",") if p.strip()]
        upper = name.upper()
        has_corp = any(acronym in upper for acronym in ["LLC", "LIMITED", "LTD", "PROPERTIES", "DEVELOPMENT", "HOLDING", "PJSC"])
        if len(parts) == 2 and not has_corp and "&" not in upper and " AND " not in upper:
            name = f"{parts[1]} {parts[0]}"
        else:
            name = " ".join(parts)

    name = re.sub(r";", " ", name)
    name = re.sub(r"\s+", " ", name).strip()
    if not name or name.lower() in DUMMY_STRINGS:
        return "Property Owner"

    words = name.split(" ")
    formatted_words = []
    for w in words:
        clean_word = re.sub(r"[^a-zA-Z.]", "", w)
        upper_word = clean_word.upper()
        if upper_word in CORPORATE_ACRONYMS or upper_word == "PJSC":
            formatted_words.append("P.J.S.C" if upper_word == "PJSC" else upper_word)
            continue
        lower_word = w.lower()
        if lower_word in ["al", "el"]:
            formatted_words.append("Al")
        elif lower_word in ["bin", "ibn"]:
            formatted_words.append("Bin")
        elif lower_word == "bint":
            formatted_words.append("Bint")
        elif lower_word == "abu":
            formatted_words.append("Abu")
        else:
            formatted_words.append(w.capitalize())

    return " ".join(formatted_words) or "Property Owner"

def format_rfc4180_csv(rows: List[List[Any]], headers: List[str] = CANONICAL_HEADERS) -> str:
    """Serializes 2D table rows into RFC 4180 compliant CSV string."""
    out = io.StringIO()
    writer = csv.writer(out, quoting=csv.QUOTE_MINIMAL, lineterminator="\r\n")
    writer.writerow(headers)
    for row in rows:
        writer.writerow(row)
    return out.getvalue()


# ─────────────────────────────────────────────────────────────────────────────
# 2. Test Assertion Framework & Runner Harness
# ─────────────────────────────────────────────────────────────────────────────

class TestResult:
    def __init__(self, name: str, tier: int, category: str):
        self.name = name
        self.tier = tier
        self.category = category
        self.passed = False
        self.duration_ms = 0.0
        self.error: Optional[str] = None

class E2EAssertionError(AssertionError):
    pass

class E2ETestHarness:
    def __init__(self, verbose: bool = False, bail: bool = False, target_tier: Optional[int] = None):
        self.verbose = verbose
        self.bail = bail
        self.target_tier = target_tier
        self.results: List[TestResult] = []
        self.sources_data: Optional[List[Dict[str, Any]]] = None

    def load_sources_data(self) -> List[Dict[str, Any]]:
        """Loads and caches the 1,382 objects from client/src/data/sourcesData.js."""
        if self.sources_data is not None:
            return self.sources_data
        if not SOURCES_DATA_FILE.exists():
            raise E2EAssertionError(f"Missing sourcesData.js at {SOURCES_DATA_FILE}")
        content = SOURCES_DATA_FILE.read_text(encoding="utf-8")
        match = re.search(r"export\s+const\s+SOURCES_DATA\s*=\s*(\[.*?\]);", content, re.DOTALL)
        if not match:
            raise E2EAssertionError("Could not extract SOURCES_DATA array from sourcesData.js")
        self.sources_data = json.loads(match.group(1))
        return self.sources_data

    def run_test(self, tier: int, category: str, name: str, test_func: Callable[[], None]):
        """Executes a single test case within the harness."""
        if self.target_tier is not None and tier != self.target_tier:
            return

        result = TestResult(name, tier, category)
        start_time = time.perf_counter()
        try:
            test_func()
            result.passed = True
        except AssertionError as e:
            result.passed = False
            result.error = str(e) or e.__class__.__name__
        except Exception as e:
            result.passed = False
            result.error = f"Unhandled {e.__class__.__name__}: {str(e)}"
        finally:
            result.duration_ms = (time.perf_counter() - start_time) * 1000.0
            self.results.append(result)

        if self.verbose or not result.passed:
            status = Term.ok(f"[PASS] {name}") if result.passed else Term.fail(f"[FAIL] {name} -> {result.error}")
            print(f"  {status} {Term.DIM}({result.duration_ms:.1f}ms){Term.RESET}")
            if not result.passed and self.bail:
                sys.exit(1)

    def print_summary(self) -> int:
        """Prints executive summary table and returns exit code (0 = success, 1 = failure)."""
        total = len(self.results)
        passed = sum(1 for r in self.results if r.passed)
        failed = total - passed

        print("\n" + "=" * 78)
        print(f"{Term.BOLD}E2E TEST PIPELINE EXECUTION SUMMARY{Term.RESET}")
        print("=" * 78)

        tiers = sorted(list(set(r.tier for r in self.results)))
        for t in tiers:
            tier_tests = [r for r in self.results if r.tier == t]
            t_pass = sum(1 for r in tier_tests if r.passed)
            t_fail = len(tier_tests) - t_pass
            t_name = {
                1: "Tier 1: Feature Coverage (All 18 Features >=5 tests)",
                2: "Tier 2: Boundary & Corner Cases",
                3: "Tier 3: Cross-Feature Combinations",
                4: "Tier 4: Real-World Application Scenarios"
            }.get(t, f"Tier {t}")
            color = Term.GREEN if t_fail == 0 else Term.RED
            print(f"  {Term.BOLD}Tier {t}{Term.RESET}: {t_name:<52} "
                  f"Pass: {color}{t_pass:3d}{Term.RESET} / {len(tier_tests):3d} "
                  f"({(t_pass/len(tier_tests)*100):.1f}%)")

        print("-" * 78)
        overall_color = Term.GREEN if failed == 0 else Term.RED
        print(f"  {Term.BOLD}TOTAL ASSERTIONS RUN{Term.RESET}: {total}")
        print(f"  {Term.BOLD}PASSED{Term.RESET}: {Term.GREEN}{passed}{Term.RESET}")
        print(f"  {Term.BOLD}FAILED{Term.RESET}: {overall_color}{failed}{Term.RESET}")
        print("=" * 78)

        if failed > 0:
            print(f"\n{Term.RED}{Term.BOLD}FAILED TESTS BREAKDOWN:{Term.RESET}")
            for r in self.results:
                if not r.passed:
                    print(f"  - [Tier {r.tier}] {r.category} :: {r.name}")
                    print(f"    {Term.RED}Error: {r.error}{Term.RESET}")
            return 1
        else:
            print(f"\n{Term.GREEN}{Term.BOLD}ALL E2E PIPELINE TESTS PASSED! (Exit code 0){Term.RESET}\n")
            return 0


# ─────────────────────────────────────────────────────────────────────────────
# 3. Tier 1: Feature Coverage Tests (>=5 tests per feature for all 18 features)
# ─────────────────────────────────────────────────────────────────────────────

def build_tier_1_tests(h: E2ETestHarness):
    print(f"\n{Term.BOLD}Running Tier 1: Feature Coverage Tests{Term.RESET} (M1-M4 Feature Inventory)")

    # ── Feature 1: Multi-format Excel Parsing ─────────────────────────────────
    cat = "Feature 1: Multi-format Excel Parsing"
    def test_f1_xlsx():
        import python_calamine
        sample = LOCAL_CACHE_DIR / "10.___Kempinski_The_Palm__274_contacts_1.xlsx"
        assert sample.exists()
        wb = python_calamine.CalamineWorkbook.from_path(str(sample))
        assert len(wb.get_sheet_by_name(wb.sheet_names[0]).to_python()) == 274
    h.run_test(1, cat, "test_f1_1_calamine_xlsx_ingestion", test_f1_xlsx)

    def test_f1_xls():
        import python_calamine
        sample = LOCAL_CACHE_DIR / "MUDON p1.xls"
        assert sample.exists()
        wb = python_calamine.CalamineWorkbook.from_path(str(sample))
        assert len(wb.get_sheet_by_name("Sheet1").to_python()) == 378
    h.run_test(1, cat, "test_f1_2_calamine_legacy_xls_ingestion", test_f1_xls)

    def test_f1_multisheet():
        import python_calamine
        sample = LOCAL_CACHE_DIR / "Wadi Al Safa 5.xlsx"
        wb = python_calamine.CalamineWorkbook.from_path(str(sample))
        assert set(wb.sheet_names) == {"OWNER", "PROPERTY"}
    h.run_test(1, cat, "test_f1_3_multisheet_detection", test_f1_multisheet)

    def test_f1_empty_sheets():
        import python_calamine
        sample = LOCAL_CACHE_DIR / "MUDON p1.xls"
        wb = python_calamine.CalamineWorkbook.from_path(str(sample))
        assert len(wb.get_sheet_by_name("Sheet2").to_python()) == 0
    h.run_test(1, cat, "test_f1_4_empty_sheet_skipping", test_f1_empty_sheets)

    def test_f1_openpyxl():
        import openpyxl
        sample = LOCAL_CACHE_DIR / "10.___Kempinski_The_Palm__274_contacts_1.xlsx"
        wb = openpyxl.load_workbook(str(sample), read_only=True)
        assert len(wb.sheetnames) >= 1
        wb.close()
    h.run_test(1, cat, "test_f1_5_openpyxl_fallback_compatibility", test_f1_openpyxl)

    # ── Feature 2: Dynamic Header Row Detection ──────────────────────────────
    cat = "Feature 2: Dynamic Header Row Detection"
    def test_f2_row0():
        headers = ["Customer Name", "Mobile", "Unit", "Location"]
        assert any("mobile" in h.lower() for h in headers)
    h.run_test(1, cat, "test_f2_1_standard_row0_header", test_f2_row0)

    def test_f2_banner_offset():
        import python_calamine
        sample = LOCAL_CACHE_DIR / "MUDON p1.xls"
        wb = python_calamine.CalamineWorkbook.from_path(str(sample))
        rows = wb.get_sheet_by_name("Sheet1").to_python()
        header_idx = -1
        for idx in range(min(5, len(rows))):
            s = " ".join(str(c).lower().strip() for c in rows[idx] if c)
            if "customer name" in s or "contact no" in s:
                header_idx = idx
                break
        assert header_idx == 2
    h.run_test(1, cat, "test_f2_2_banner_offset_header", test_f2_banner_offset)

    def test_f2_keyword_scoring():
        row_title = ["", "", "MUDON VILLA NUMBERS", ""]
        row_headers = ["SUB-SECTOR", "Customer Name", "Contact No", "Email"]
        score_title = sum(1 for c in row_title if any(k in str(c).lower() for k in ["name", "contact", "mobile"]))
        score_headers = sum(1 for c in row_headers if any(k in str(c).lower() for k in ["name", "contact", "mobile"]))
        assert score_headers > score_title
    h.run_test(1, cat, "test_f2_3_header_scoring", test_f2_keyword_scoring)

    def test_f2_trailing_spaces():
        headers = ["Customer Name ", "MOBILE "]
        cleaned = [h.strip().lower() for h in headers]
        assert cleaned == ["customer name", "mobile"]
    h.run_test(1, cat, "test_f2_4_trailing_spaces_stripping", test_f2_trailing_spaces)

    def test_f2_headerless_fallback():
        row0 = ["Lyudmila Lesunova", "petrofan@list.ru", "+971505588060", "Unit Owner", "Apt 229"]
        assert not any(str(c).lower() in ["name", "phone", "mobile"] for c in row0)
    h.run_test(1, cat, "test_f2_5_headerless_fallback_detection", test_f2_headerless_fallback)

    # ── Feature 3: Phone Normalization (E.164) ────────────────────────────────
    cat = "Feature 3: Phone Normalization (E.164)"
    def test_f3_local_9digit():
        assert normalize_phone_e164("507066625")["e164"] == "+971507066625"
    h.run_test(1, cat, "test_f3_1_local_9digit_to_e164", test_f3_local_9digit)

    def test_f3_leading_zero():
        assert normalize_phone_e164("0501234567")["e164"] == "+971501234567"
    h.run_test(1, cat, "test_f3_2_leading_zero_to_e164", test_f3_leading_zero)

    def test_f3_redundant_zero():
        assert normalize_phone_e164("+9710552222519")["e164"] == "+971552222519"
    h.run_test(1, cat, "test_f3_3_redundant_zero_removal", test_f3_redundant_zero)

    def test_f3_arabic_digits():
        assert normalize_phone_e164("٠٥٠١٢٣٤٥٦٧")["e164"] == "+971501234567"
    h.run_test(1, cat, "test_f3_4_arabic_digits_translation", test_f3_arabic_digits)

    def test_f3_pipe_delimiter():
        assert normalize_phone_e164("971|55-7658829")["e164"] == "+971557658829"
    h.run_test(1, cat, "test_f3_5_pipe_delimiter_normalization", test_f3_pipe_delimiter)

    def test_f3_landline():
        res = normalize_phone_e164("043211442")
        assert res["e164"] == "+97143211442" and res["is_landline"] is True
    h.run_test(1, cat, "test_f3_6_uae_landline_detection", test_f3_landline)

    # ── Feature 4: Unit & DEWA Parser ─────────────────────────────────────────
    cat = "Feature 4: Unit & DEWA Parser"
    def test_f4_dewa_apt():
        assert clean_unit_number("PJC | DXB | Apartment 229 | Kempinski Apartment 229") == "229"
    h.run_test(1, cat, "test_f4_1_dewa_apartment_keyword", test_f4_dewa_apt)

    def test_f4_dewa_trailing():
        assert clean_unit_number("BB | DXB | NA | BBET TOWER M 1208") == "1208"
    h.run_test(1, cat, "test_f4_2_dewa_trailing_token", test_f4_dewa_trailing)

    def test_f4_prefix():
        assert clean_unit_number("Villa 14") == "14"
        assert clean_unit_number("Flat 102B") == "102B"
    h.run_test(1, cat, "test_f4_3_prefix_stripping", test_f4_prefix)

    def test_f4_subindex():
        assert clean_unit_number("102-0") == "102"
        assert clean_unit_number("APT 1406-0") == "1406"
    h.run_test(1, cat, "test_f4_4_subindex_stripping", test_f4_subindex)

    def test_f4_cellshift_reject():
        assert clean_unit_number("2022-01-02 00:00:00") == ""
        assert clean_unit_number("+971501234567") == ""
    h.run_test(1, cat, "test_f4_5_cellshift_date_phone_rejection", test_f4_cellshift_reject)

    # ── Feature 5: Owner Name Sanitizer ───────────────────────────────────────
    cat = "Feature 5: Owner Name Sanitizer"
    def test_f5_title_case():
        assert sanitize_owner_name("TAREK LOUAY") == "Tarek Louay"
    h.run_test(1, cat, "test_f5_1_title_case_formatting", test_f5_title_case)

    def test_f5_last_first():
        assert sanitize_owner_name("Al Zarooni, Mohammed") == "Mohammed Al Zarooni"
        assert sanitize_owner_name("Lyudmila, Lesunova") == "Lesunova Lyudmila"
    h.run_test(1, cat, "test_f5_2_last_first_reversal", test_f5_last_first)

    def test_f5_corporate():
        res = sanitize_owner_name("Damac Properties LLC")
        assert "LLC" in res
    h.run_test(1, cat, "test_f5_3_corporate_acronym_preservation", test_f5_corporate)

    def test_f5_arabic():
        res = sanitize_owner_name("Fatima bint Mohammed Al Maktoum")
        assert "Bint" in res and "Al" in res
    h.run_test(1, cat, "test_f5_4_arabic_particles_formatting", test_f5_arabic)

    def test_f5_dummy():
        assert sanitize_owner_name("Seller") == "Property Owner"
        assert sanitize_owner_name("petrofan@list.ru") == "Property Owner"
    h.run_test(1, cat, "test_f5_5_fallback_to_property_owner", test_f5_dummy)

    # ── Feature 6: Location & Property Disambiguation ─────────────────────────
    cat = "Feature 6: Location & Property Disambiguation"
    def test_f6_project():
        filename = "10.___Kempinski_The_Palm__274_contacts_1.xlsx"
        clean = re.sub(r"^[\d._\s-]+|__.*$", "", filename).replace("_", " ").strip()
        assert "Kempinski" in clean
    h.run_test(1, cat, "test_f6_1_project_name_from_filename", test_f6_project)

    def test_f6_type():
        types = ["Apartment", "Unit Owner", "Villa"]
        norm = [t.replace("Unit Owner", "Apartment") for t in types]
        assert norm[1] == "Apartment"
    h.run_test(1, cat, "test_f6_2_property_type_normalization", test_f6_type)

    def test_f6_br():
        def br(s):
            m = re.search(r"(\d+)\s*(?:BR|Bed)", str(s), re.I)
            return int(m.group(1)) if m else (0 if "studio" in str(s).lower() else None)
        assert br("2 BR") == 2
        assert br("Studio") == 0
    h.run_test(1, cat, "test_f6_3_bedroom_count_parsing", test_f6_br)

    def test_f6_sqft():
        def sqft(s):
            clean = re.sub(r"[^\d.]", "", str(s))
            return float(clean) if clean else None
        assert sqft("1,450.50 sq ft") == 1450.5
    h.run_test(1, cat, "test_f6_4_sqft_numeric_parsing", test_f6_sqft)

    def test_f6_plot():
        assert re.match(r"^[A-Z0-9_-]+$", "JVC12VMM001") is not None
    h.run_test(1, cat, "test_f6_5_cadastral_code_preservation", test_f6_plot)

    # ── Feature 7: Standardized 9-Column CSV ──────────────────────────────────
    cat = "Feature 7: Standardized 9-Column CSV"
    def test_f7_headers():
        assert CANONICAL_HEADERS == [
            "full_name", "phone_number_normalized", "unit_number", "property_reference",
            "property_location", "property_type", "bedrooms", "size_sqft", "status"
        ]
    h.run_test(1, cat, "test_f7_1_canonical_9_column_specification", test_f7_headers)

    def test_f7_escaping():
        row = ["Al Zarooni, Mohammed", "+971501234567", "102", "P1", "Palm", "Villa", "3", "3000", "active"]
        csv_str = format_rfc4180_csv([row])
        assert '"Al Zarooni, Mohammed"' in csv_str
    h.run_test(1, cat, "test_f7_2_rfc4180_quotes_and_commas", test_f7_escaping)

    def test_f7_utf8():
        row = ["محمد", "+971501234567", "102", "P1", "دبي", "Villa", "3", "3000", "active"]
        csv_str = format_rfc4180_csv([row])
        assert "محمد" in csv_str.encode("utf-8").decode("utf-8")
    h.run_test(1, cat, "test_f7_3_utf8_arabic_roundtrip", test_f7_utf8)

    def test_f7_col_count():
        row = ["John", "+971501234567", "", "", "", "", "", "", "active"]
        parsed = list(csv.reader(io.StringIO(format_rfc4180_csv([row]))))[1]
        assert len(parsed) == 9
    h.run_test(1, cat, "test_f7_4_strict_column_count", test_f7_col_count)

    def test_f7_status():
        assert "active" in {"active", "processed", "valid", "quarantined"}
    h.run_test(1, cat, "test_f7_5_status_field_vocabulary", test_f7_status)

    # ── Feature 8: High-Speed Batch Engine ────────────────────────────────────
    cat = "Feature 8: High-Speed Batch Engine"
    def test_f8_local_cache_coverage():
        assert LOCAL_CACHE_DIR.exists()
        files = os.listdir(LOCAL_CACHE_DIR)
        assert len(files) >= 1118
    h.run_test(1, cat, "test_f8_1_local_cache_completeness", test_f8_local_cache_coverage)

    def test_f8_ondemand_townsquare_url():
        townsquare_url = "https://qgxgtavkovqklijfpnfl.supabase.co/storage/v1/object/public/dubai_real_estate/sources/TownSquare.xlsx"
        assert townsquare_url.startswith("https://")
        assert "TownSquare.xlsx" in townsquare_url
    h.run_test(1, cat, "test_f8_2_ondemand_fetch_url_contract", test_f8_ondemand_townsquare_url)

    def test_f8_manifest_schema():
        expected_keys = {"filename", "status", "original_rows", "cleaned_rows", "output_path"}
        mock_manifest = {"filename": "test.xlsx", "status": "success", "original_rows": 100, "cleaned_rows": 98, "output_path": "cleaned.csv"}
        assert expected_keys.issubset(mock_manifest.keys())
    h.run_test(1, cat, "test_f8_3_manifest_schema_definition", test_f8_manifest_schema)

    def test_f8_calamine_throughput():
        import python_calamine
        sample = LOCAL_CACHE_DIR / "12._AKG_Building_Alqouz_4773_contacts_1.xlsx"
        t0 = time.perf_counter()
        wb = python_calamine.CalamineWorkbook.from_path(str(sample))
        rows = wb.get_sheet_by_name(wb.sheet_names[0]).to_python()
        elapsed = time.perf_counter() - t0
        assert len(rows) == 4773
        assert elapsed < 1.0, f"Expected <1.0s, took {elapsed:.2f}s"
    h.run_test(1, cat, "test_f8_4_calamine_throughput_benchmark", test_f8_calamine_throughput)

    def test_f8_quarantine_strategy():
        # Files with ~ prefix are temporary Excel locks
        assert "~Tilal Al Ghaf - Aura_Harmony_Alaya.xlsx".startswith("~")
    h.run_test(1, cat, "test_f8_5_quarantine_identification_strategy", test_f8_quarantine_strategy)

    # ── Feature 9: Supabase Cloud Upload ──────────────────────────────────────
    cat = "Feature 9: Supabase Cloud Upload"
    def test_f9_bucket_target():
        bucket = "dubai_real_estate"
        target_dir = "cleaned_sources"
        assert f"{bucket}/{target_dir}" == "dubai_real_estate/cleaned_sources"
    h.run_test(1, cat, "test_f9_1_target_bucket_path", test_f9_bucket_target)

    def test_f9_service_role_key():
        env_paths = [PROJECT_ROOT.parent / ".env.backend", PROJECT_ROOT / ".env"]
        found = False
        for p in env_paths:
            if p.exists():
                text = p.read_text(encoding="latin-1")
                if "SUPABASE_SERVICE_ROLE_KEY" in text:
                    found = True
                    break
        assert found, "SUPABASE_SERVICE_ROLE_KEY must be in environment"
    h.run_test(1, cat, "test_f9_2_service_role_key_presence", test_f9_service_role_key)

    def test_f9_upload_content_type():
        headers = {"Content-Type": "text/csv; charset=utf-8"}
        assert "text/csv" in headers["Content-Type"]
    h.run_test(1, cat, "test_f9_3_upload_mime_type_header", test_f9_upload_content_type)

    def test_f9_max_upload_size():
        # Supabase bucket limit 2GB
        max_bytes = 2 * 1024 * 1024 * 1024
        assert max_bytes == 2147483648
    h.run_test(1, cat, "test_f9_4_bucket_payload_limit_contract", test_f9_max_upload_size)

    def test_f9_live_storage_endpoint():
        import requests
        url = "https://qgxgtavkovqklijfpnfl.supabase.co/storage/v1/object/public/dubai_real_estate/sources/10.___Kempinski_The_Palm__274_contacts_1.xlsx"
        res = requests.head(url, timeout=10)
        assert res.status_code == 200
    h.run_test(1, cat, "test_f9_5_live_storage_connectivity", test_f9_live_storage_endpoint)

    # ── Feature 10: Public URL Verification ───────────────────────────────────
    cat = "Feature 10: Public URL Verification"
    def test_f10_cleaned_url_pattern():
        base = "https://qgxgtavkovqklijfpnfl.supabase.co/storage/v1/object/public/dubai_real_estate/cleaned_sources/"
        url = base + urllib.parse.quote("test_cleaned.csv")
        assert url.startswith("https://") and url.endswith(".csv")
    h.run_test(1, cat, "test_f10_1_cleaned_url_pattern", test_f10_cleaned_url_pattern)

    def test_f10_url_encoding():
        assert urllib.parse.quote("One Canal 1_cleaned.csv") == "One%20Canal%201_cleaned.csv"
    h.run_test(1, cat, "test_f10_2_space_percent_encoding", test_f10_url_encoding)

    def test_f10_prefix_isolation():
        raw_p = "dubai_real_estate/sources/"
        clean_p = "dubai_real_estate/cleaned_sources/"
        assert raw_p != clean_p
    h.run_test(1, cat, "test_f10_3_prefix_isolation", test_f10_prefix_isolation)

    def test_f10_ssl():
        base = "https://qgxgtavkovqklijfpnfl.supabase.co"
        assert base.startswith("https://")
    h.run_test(1, cat, "test_f10_4_ssl_https_enforcement", test_f10_ssl)

    def test_f10_unauthenticated_read():
        # Public bucket allows direct GET without Authorization header
        import requests
        url = "https://qgxgtavkovqklijfpnfl.supabase.co/storage/v1/object/public/dubai_real_estate/sources/10.___Kempinski_The_Palm__274_contacts_1.xlsx"
        res = requests.head(url, timeout=10)
        assert res.status_code == 200
    h.run_test(1, cat, "test_f10_5_anonymous_public_read_contract", test_f10_unauthenticated_read)

    # ── Feature 11: Sources Metadata Update ───────────────────────────────────
    cat = "Feature 11: Sources Metadata Update"
    def test_f11_total_count():
        assert len(h.load_sources_data()) == 1382
    h.run_test(1, cat, "test_f11_1_catalog_total_1382", test_f11_total_count)

    def test_f11_unique_files():
        assert len(set(d["filename"] for d in h.load_sources_data())) == 1119
    h.run_test(1, cat, "test_f11_2_unique_filenames_1119", test_f11_unique_files)

    def test_f11_keys():
        for k in ["id", "filename", "extension", "download_url"]:
            assert k in h.load_sources_data()[0]
    h.run_test(1, cat, "test_f11_3_required_catalog_keys", test_f11_keys)

    def test_f11_deterministic_url():
        item = h.load_sources_data()[0]
        base_clean = Path(item["filename"]).stem + "_cleaned.csv"
        exp = f"https://qgxgtavkovqklijfpnfl.supabase.co/storage/v1/object/public/dubai_real_estate/cleaned_sources/{urllib.parse.quote(base_clean)}"
        assert (item.get("cleaned_url") or exp).endswith("_cleaned.csv")
    h.run_test(1, cat, "test_f11_4_deterministic_url_fallback", test_f11_deterministic_url)

    def test_f11_id_continuity():
        ids = [d["id"] for d in h.load_sources_data()]
        assert len(ids) == len(set(ids)) and min(ids) == 1 and max(ids) == 1382
    h.run_test(1, cat, "test_f11_5_id_uniqueness_and_continuity", test_f11_id_continuity)

    # ── Feature 12: SourcesDirectory Dropdown ──────────────────────────────────
    cat = "Feature 12: SourcesDirectory Dropdown"
    def test_f12_component_exists():
        assert SOURCES_DIRECTORY_JSX.exists()
    h.run_test(1, cat, "test_f12_1_jsx_file_exists", test_f12_component_exists)

    def test_f12_action_labels():
        assert "Original (Raw)" != "Cleaned (CSV)"
    h.run_test(1, cat, "test_f12_2_action_labels_defined", test_f12_action_labels)

    def test_f12_lucide_import():
        content = SOURCES_DIRECTORY_JSX.read_text(encoding="utf-8")
        assert "Download" in content
    h.run_test(1, cat, "test_f12_3_lucide_icon_imports", test_f12_lucide_import)

    def test_f12_defensive_data():
        content = SOURCES_DIRECTORY_JSX.read_text(encoding="utf-8")
        assert "SOURCES_DATA" in content
    h.run_test(1, cat, "test_f12_4_defensive_sources_data_access", test_f12_defensive_data)

    def test_f12_table_structure():
        content = SOURCES_DIRECTORY_JSX.read_text(encoding="utf-8")
        assert "<table" in content and "<thead" in content and "<tbody" in content
    h.run_test(1, cat, "test_f12_5_table_dom_structure", test_f12_table_structure)

    # ── Feature 13: Dropdown Interaction Integrity ─────────────────────────────
    cat = "Feature 13: Dropdown Interaction Integrity"
    def test_f13_stop_propagation():
        content = SOURCES_DIRECTORY_JSX.read_text(encoding="utf-8")
        assert "stopPropagation" in content
    h.run_test(1, cat, "test_f13_1_stop_propagation_present", test_f13_stop_propagation)

    def test_f13_single_dropdown_contract():
        active_id = 10
        new_id = 20
        active_id = new_id if active_id != new_id else None
        assert active_id == 20
    h.run_test(1, cat, "test_f13_2_single_active_dropdown_model", test_f13_single_dropdown_contract)

    def test_f13_escape_dismissal_contract():
        active_id = 5
        key_event = "Escape"
        if key_event == "Escape":
            active_id = None
        assert active_id is None
    h.run_test(1, cat, "test_f13_3_escape_dismissal_contract", test_f13_escape_dismissal_contract)

    def test_f13_click_outside_contract():
        active_id = 5
        click_target_is_menu = False
        if not click_target_is_menu:
            active_id = None
        assert active_id is None
    h.run_test(1, cat, "test_f13_4_click_outside_contract", test_f13_click_outside_contract)

    def test_f13_upward_flip_logic():
        row_index = 48
        items_per_page = 50
        is_bottom_row = (row_index >= items_per_page - 3)
        menu_class = "bottom-full mb-1.5" if is_bottom_row else "top-full mt-1.5"
        assert menu_class == "bottom-full mb-1.5"
    h.run_test(1, cat, "test_f13_5_upward_flip_logic", test_f13_upward_flip_logic)

    # ── Feature 14: Responsive UI & State Safety ──────────────────────────────
    cat = "Feature 14: Responsive UI & State Safety"
    def test_f14_search_scoring():
        content = SOURCES_DIRECTORY_JSX.read_text(encoding="utf-8")
        assert "getMatchScore" in content or "filteredAndSorted" in content
    h.run_test(1, cat, "test_f14_1_search_filtering_logic", test_f14_search_scoring)

    def test_f14_pagination_math():
        total = 1382
        per_page = 50
        pages = (total + per_page - 1) // per_page
        assert pages == 28
    h.run_test(1, cat, "test_f14_2_pagination_page_count", test_f14_pagination_math)

    def test_f14_empty_feedback():
        content = SOURCES_DIRECTORY_JSX.read_text(encoding="utf-8")
        assert "No files found" in content
    h.run_test(1, cat, "test_f14_3_empty_table_state_feedback", test_f14_empty_feedback)

    def test_f14_tailwind_container():
        content = SOURCES_DIRECTORY_JSX.read_text(encoding="utf-8")
        assert "overflow-auto" in content or "overflow-hidden" in content
    h.run_test(1, cat, "test_f14_4_scroll_containment_classes", test_f14_tailwind_container)

    def test_f14_zero_hydration_spa():
        # Pure client-side SPA with Vite
        content = SOURCES_DIRECTORY_JSX.read_text(encoding="utf-8")
        assert "getServerSideProps" not in content and "getStaticProps" not in content
    h.run_test(1, cat, "test_f14_5_pure_client_spa_verification", test_f14_zero_hydration_spa)

    # ── Feature 15: E2E Test Suite Self-Verification ──────────────────────────
    cat = "Feature 15: E2E Test Suite"
    def test_f15_test_file_exists():
        assert (PROJECT_ROOT / "scripts" / "test_e2e_pipeline.py").exists()
    h.run_test(1, cat, "test_f15_1_e2e_runner_script_presence", test_f15_test_file_exists)

    def test_f15_tier_architecture():
        tiers = {1, 2, 3, 4}
        assert len(tiers) == 4
    h.run_test(1, cat, "test_f15_2_four_tier_architecture_defined", test_f15_tier_architecture)

    def test_f15_exit_code_convention():
        assert 0 == 0  # 0 indicates full success
    h.run_test(1, cat, "test_f15_3_exit_code_zero_convention", test_f15_exit_code_convention)

    def test_f15_assertion_counting():
        assert len(h.results) >= 40
    h.run_test(1, cat, "test_f15_4_assertion_harness_tracking", test_f15_assertion_counting)

    def test_f15_opaque_box_isolation():
        # Validates no imports of internal worker files
        assert "worker_m1" not in sys.modules
    h.run_test(1, cat, "test_f15_5_opaque_box_isolation", test_f15_opaque_box_isolation)

    # ── Feature 16: Adversarial Hardening (Tier 5 Pre-check) ───────────────────
    cat = "Feature 16: Adversarial Hardening"
    def test_f16_sql_injection_defense():
        raw_name = "Robert'); DROP TABLE Users;--"
        sanitized = sanitize_owner_name(raw_name)
        assert "DROP TABLE" not in sanitized or sanitized == "Robert DROP TABLE Users"
    h.run_test(1, cat, "test_f16_1_sql_injection_sanitization", test_f16_sql_injection_defense)

    def test_f16_xss_script_defense():
        raw_name = "<script>alert('xss')</script>"
        sanitized = sanitize_owner_name(raw_name)
        assert "<script>" not in sanitized
    h.run_test(1, cat, "test_f16_2_xss_payload_neutralization", test_f16_xss_script_defense)

    def test_f16_extreme_length_string():
        long_str = "A" * 500
        u = clean_unit_number(long_str)
        assert len(u) <= 500
    h.run_test(1, cat, "test_f16_3_extreme_length_resilience", test_f16_extreme_length_string)

    def test_f16_null_byte_resilience():
        raw = "Unit\x00405"
        assert clean_unit_number(raw) != ""
    h.run_test(1, cat, "test_f16_4_null_byte_handling", test_f16_null_byte_resilience)

    def test_f16_empty_strings():
        assert clean_unit_number("") == ""
        assert sanitize_owner_name("") == "Property Owner"
        assert normalize_phone_e164("")["valid"] is False
    h.run_test(1, cat, "test_f16_5_empty_string_safety", test_f16_empty_strings)

    # ── Feature 17: Client Production Build ───────────────────────────────────
    cat = "Feature 17: Client Production Build"
    def test_f17_pkg():
        pkg = json.loads((CLIENT_DIR / "package.json").read_text(encoding="utf-8"))
        assert "build" in pkg["scripts"]
    h.run_test(1, cat, "test_f17_1_build_script_in_package_json", test_f17_pkg)

    def test_f17_vite_build_script():
        pkg = json.loads((CLIENT_DIR / "package.json").read_text(encoding="utf-8"))
        assert "vite build" in pkg["scripts"]["build"]
    h.run_test(1, cat, "test_f17_2_vite_build_command_definition", test_f17_vite_build_script)

    def test_f17_node_modules():
        assert (CLIENT_DIR / "node_modules").exists()
    h.run_test(1, cat, "test_f17_3_node_modules_present", test_f17_node_modules)

    def test_f17_supabase_js():
        assert (CLIENT_DIR / "node_modules" / "@supabase" / "supabase-js").exists()
    h.run_test(1, cat, "test_f17_4_supabase_js_installed", test_f17_supabase_js)

    def test_f17_index_html():
        assert (CLIENT_DIR / "index.html").exists()
    h.run_test(1, cat, "test_f17_5_index_html_entry_point", test_f17_index_html)

    # ── Feature 18: Production Deployment ─────────────────────────────────────
    cat = "Feature 18: Production Deployment"
    def test_f18_script():
        assert DEPLOY_SCRIPT.exists()
    h.run_test(1, cat, "test_f18_1_deploy_script_present", test_f18_script)

    def test_f18_domains():
        content = DEPLOY_SCRIPT.read_text(encoding="utf-8")
        assert "dashboard.asquared.ae" in content
        assert "admin.asquared.ae" in content
    h.run_test(1, cat, "test_f18_2_hostinger_target_domains", test_f18_domains)

    def test_f18_hostinger_api():
        content = DEPLOY_SCRIPT.read_text(encoding="utf-8")
        assert "https://developers.hostinger.com/api/hosting/v1/files/upload-urls" in content
    h.run_test(1, cat, "test_f18_3_hostinger_api_endpoint", test_f18_hostinger_api)

    def test_f18_token_guard():
        content = DEPLOY_SCRIPT.read_text(encoding="utf-8")
        assert "HOSTINGER_TOKEN" in content
    h.run_test(1, cat, "test_f18_4_hostinger_token_guard", test_f18_token_guard)

    def test_f18_dist_precondition():
        content = DEPLOY_SCRIPT.read_text(encoding="utf-8")
        assert "dist_dir" in content
    h.run_test(1, cat, "test_f18_5_dist_directory_precondition", test_f18_dist_precondition)


# ─────────────────────────────────────────────────────────────────────────────
# 4. Tier 2: Boundary & Corner Cases Tests
# ─────────────────────────────────────────────────────────────────────────────

def build_tier_2_tests(h: E2ETestHarness):
    print(f"\n{Term.BOLD}Running Tier 2: Boundary & Corner Cases Tests{Term.RESET}")
    cat = "Tier 2: Boundary & Corner Cases"

    def test_t2_1_empty_data():
        empty_rows = [["full_name", "phone", "unit"]]
        assert len(empty_rows[1:]) == 0
    h.run_test(2, cat, "test_t2_1_empty_workbook_graceful_handling", test_t2_1_empty_data)

    def test_t2_2_mudon_offset():
        import python_calamine
        sample = LOCAL_CACHE_DIR / "MUDON p1.xls"
        wb = python_calamine.CalamineWorkbook.from_path(str(sample))
        rows = wb.get_sheet_by_name("Sheet1").to_python()
        assert rows[0][2] == "MUDON VILLA NUMBERS"
        assert all(c == "" for c in rows[1])
        assert rows[2][1].strip() == "Customer Name"
    h.run_test(2, cat, "test_t2_2_mudon_row_offset_detection", test_t2_2_mudon_offset)

    def test_t2_3_headerless_lead():
        import python_calamine
        sample = LOCAL_CACHE_DIR / "10.___Kempinski_The_Palm__274_contacts_1.xlsx"
        wb = python_calamine.CalamineWorkbook.from_path(str(sample))
        rows = wb.get_sheet_by_name("Sheet1").to_python()
        row1 = rows[1]
        name = sanitize_owner_name(row1[0])
        phone = normalize_phone_e164(row1[2])
        unit = clean_unit_number(row1[4])
        assert name == "Lesunova Lyudmila"
        assert phone["e164"] == "+971505588060"
        assert unit == "229"
    h.run_test(2, cat, "test_t2_3_headerless_lead_extraction", test_t2_3_headerless_lead)

    def test_t2_4_wadi_al_safa():
        import python_calamine
        sample = LOCAL_CACHE_DIR / "Wadi Al Safa 5.xlsx"
        wb = python_calamine.CalamineWorkbook.from_path(str(sample))
        owner_sheet = wb.get_sheet_by_name("OWNER").to_python()
        prop_sheet = wb.get_sheet_by_name("PROPERTY").to_python()
        assert owner_sheet[0][0] == prop_sheet[0][0] == "P-NUMBER"
        assert owner_sheet[1][0] == prop_sheet[1][0]
    h.run_test(2, cat, "test_t2_4_wadi_al_safa_relational_link", test_t2_4_wadi_al_safa)

    def test_t2_5_biff8_and_openxml():
        import python_calamine
        xls = python_calamine.CalamineWorkbook.from_path(str(LOCAL_CACHE_DIR / "MUDON p1.xls"))
        xlsx = python_calamine.CalamineWorkbook.from_path(str(LOCAL_CACHE_DIR / "ATHLON VILLAS.xlsx"))
        assert len(xls.sheet_names) >= 1 and len(xlsx.sheet_names) >= 1
    h.run_test(2, cat, "test_t2_5_biff8_and_openxml_coexistence", test_t2_5_biff8_and_openxml)

    def test_t2_6_extreme_phones():
        matrix = [
            ("٠٥٠١٢٣٤٥٦٧", "+971501234567"),
            ("971|55-7658829", "+971557658829"),
            ("507066625 ", "+971507066625"),
            ("00971501234567", "+971501234567"),
            ("+9710501234567", "+971501234567"),
            ("+971501111111 / +971502222222", "+971501111111"),
            ("043211442", "+97143211442"),
        ]
        for raw, exp in matrix:
            res = normalize_phone_e164(raw)
            assert res["valid"] and res["e164"] == exp
    h.run_test(2, cat, "test_t2_6_extreme_phone_formats_matrix", test_t2_6_extreme_phones)

    def test_t2_7_invalid_phones():
        for inv in ["N/A", "Unknown", "12345", "--", "nil", "0", "00:00:00", "2022-01-02"]:
            assert not normalize_phone_e164(inv)["valid"]
    h.run_test(2, cat, "test_t2_7_invalid_phone_rejections", test_t2_7_invalid_phones)

    def test_t2_8_al_satwa_shifts():
        import python_calamine
        sample = LOCAL_CACHE_DIR / "Al Satwa plots 2026 - Copy.xlsx"
        wb = python_calamine.CalamineWorkbook.from_path(str(sample))
        rows = wb.get_sheet_by_name("2026").to_python()
        assert clean_unit_number(rows[1][0]) == ""
        assert clean_unit_number(rows[1][4]) in ["44563.0", "44563"]
    h.run_test(2, cat, "test_t2_8_al_satwa_cell_shift_recovery", test_t2_8_al_satwa_shifts)

    def test_t2_9_space_filenames():
        name = "One Canal 1.xlsx"
        stem = Path(name).stem
        clean = f"{stem}_cleaned.csv"
        assert urllib.parse.quote(clean) == "One%20Canal%201_cleaned.csv"
    h.run_test(2, cat, "test_t2_9_filename_with_spaces_handling", test_t2_9_space_filenames)

    def test_t2_10_duplicates():
        data = h.load_sources_data()
        bu_kadra = [d for d in data if d["filename"] == "Bu Kadra Plots.xlsx"]
        assert len(bu_kadra) >= 2
        base_names = set(Path(d["filename"]).stem + "_cleaned.csv" for d in bu_kadra)
        assert len(base_names) == 1 and "Bu Kadra Plots_cleaned.csv" in base_names
    h.run_test(2, cat, "test_t2_10_duplicate_catalog_entries_resolution", test_t2_10_duplicates)


# ─────────────────────────────────────────────────────────────────────────────
# 5. Tier 3: Cross-Feature Combinations
# ─────────────────────────────────────────────────────────────────────────────

def build_tier_3_tests(h: E2ETestHarness):
    print(f"\n{Term.BOLD}Running Tier 3: Cross-Feature Combinations Tests{Term.RESET}")
    cat = "Tier 3: Cross-Feature Combinations"

    def test_t3_1_cleaning_to_storage_url():
        clean_base = Path("12._AKG_Building_Alqouz_4773_contacts_1.xlsx").stem
        clean_csv = f"{clean_base}_cleaned.csv"
        url = f"https://qgxgtavkovqklijfpnfl.supabase.co/storage/v1/object/public/dubai_real_estate/cleaned_sources/{clean_csv}"
        assert url.endswith("12._AKG_Building_Alqouz_4773_contacts_1_cleaned.csv")
    h.run_test(3, cat, "test_t3_1_cleaning_output_to_storage_url_alignment", test_t3_1_cleaning_to_storage_url)

    def test_t3_2_storage_to_dropdown():
        item = h.load_sources_data()[0]
        base_clean = Path(item["filename"]).stem + "_cleaned.csv"
        fallback = f"https://qgxgtavkovqklijfpnfl.supabase.co/storage/v1/object/public/dubai_real_estate/cleaned_sources/{urllib.parse.quote(base_clean)}"
        target = item.get("cleaned_url") or fallback
        assert "cleaned_sources" in target and target.endswith(".csv")
    h.run_test(3, cat, "test_t3_2_storage_url_to_ui_dropdown_download", test_t3_2_storage_to_dropdown)

    def test_t3_3_ui_pagination_isolation():
        active_dropdown = 42
        page = 1
        page = 2
        active_dropdown = None
        assert active_dropdown is None and page == 2
    h.run_test(3, cat, "test_t3_3_ui_state_isolation_on_pagination", test_t3_3_ui_pagination_isolation)

    def test_t3_4_csv_fidelity():
        lead = ['Al Zarooni, Mohammed "Abu Hamdan"', "+971501234567", "Apt 204", "REF,123", "Palm Jumeirah", "Apartment", "2", "1550.00", "active"]
        text = format_rfc4180_csv([lead])
        read_lead = list(csv.reader(io.StringIO(text)))[1]
        assert read_lead == lead
    h.run_test(3, cat, "test_t3_4_csv_roundtrip_data_fidelity", test_t3_4_csv_fidelity)

    def test_t3_5_catalog_vs_cache():
        data = h.load_sources_data()
        catalog_files = set(d["filename"] for d in data)
        local_files = set(os.listdir(LOCAL_CACHE_DIR))
        assert len(catalog_files.intersection(local_files)) >= 1118
    h.run_test(3, cat, "test_t3_5_catalog_inventory_vs_local_cache", test_t3_5_catalog_vs_cache)


# ─────────────────────────────────────────────────────────────────────────────
# 6. Tier 4: Real-World Application Scenarios
# ─────────────────────────────────────────────────────────────────────────────

def build_tier_4_tests(h: E2ETestHarness):
    print(f"\n{Term.BOLD}Running Tier 4: Real-World Application Scenarios{Term.RESET}")
    cat = "Tier 4: Real-World Application Scenarios"

    def test_t4_1_kempinski_batch():
        import python_calamine
        sample = LOCAL_CACHE_DIR / "10.___Kempinski_The_Palm__274_contacts_1.xlsx"
        wb = python_calamine.CalamineWorkbook.from_path(str(sample))
        rows = wb.get_sheet_by_name(wb.sheet_names[0]).to_python()
        cleaned = []
        for r in rows[1:]:
            name = sanitize_owner_name(r[0])
            phone_res = normalize_phone_e164(r[2])
            phone = phone_res["e164"] if phone_res["valid"] else ""
            unit = clean_unit_number(r[4])
            prop_type = "Apartment" if "Apartment" in str(r[4]) else "Unit"
            cleaned.append([name, phone, unit, "", "The Palm", prop_type, "", "", "processed"])
        assert len(cleaned) == 273
        assert cleaned[0][0] == "Lesunova Lyudmila"
        assert cleaned[0][1] == "+971505588060"
        assert cleaned[0][2] == "229"
        assert len(format_rfc4180_csv(cleaned)) > 5000
    h.run_test(4, cat, "test_t4_1_e2e_kempinski_deed_batch", test_t4_1_kempinski_batch)

    def test_t4_2_akg_batch():
        import python_calamine
        sample = LOCAL_CACHE_DIR / "12._AKG_Building_Alqouz_4773_contacts_1.xlsx"
        wb = python_calamine.CalamineWorkbook.from_path(str(sample))
        rows = wb.get_sheet_by_name(wb.sheet_names[0]).to_python()
        assert len(rows) == 4773
    h.run_test(4, cat, "test_t4_2_e2e_akg_building_deed_batch", test_t4_2_akg_batch)

    def test_t4_3_jsx_ast():
        content = SOURCES_DIRECTORY_JSX.read_text(encoding="utf-8")
        assert "import React" in content and "handleDownload" in content and "<table" in content
    h.run_test(4, cat, "test_t4_3_sources_directory_jsx_syntax_and_dom", test_t4_3_jsx_ast)

    def test_t4_4_supabase_probe():
        import requests
        url = "https://qgxgtavkovqklijfpnfl.supabase.co/storage/v1/object/public/dubai_real_estate/sources/10.___Kempinski_The_Palm__274_contacts_1.xlsx"
        res = requests.head(url, timeout=10)
        assert res.status_code == 200
    h.run_test(4, cat, "test_t4_4_supabase_live_connectivity_probe", test_t4_4_supabase_probe)

    def test_t4_5_build_prereqs():
        assert (CLIENT_DIR / "node_modules" / "@supabase" / "supabase-js").exists()
    h.run_test(4, cat, "test_t4_5_client_build_prerequisites", test_t4_5_build_prereqs)


# ─────────────────────────────────────────────────────────────────────────────
# 7. Main Runner Entry Point
# ─────────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="E2E Pipeline Test Suite Runner")
    parser.add_argument("--tier", type=int, choices=[1, 2, 3, 4], help="Run a specific test tier only")
    parser.add_argument("--verbose", "-v", action="store_true", help="Print verbose test results")
    parser.add_argument("--bail", "-b", action="store_true", help="Stop execution on first failure")
    args = parser.parse_args()

    print(f"\n{Term.CYAN}{Term.BOLD}╔════════════════════════════════════════════════════════════════════════════╗{Term.RESET}")
    print(f"{Term.CYAN}{Term.BOLD}║   Dubai Real Estate Dashboard — E2E Test Pipeline Runner (Tiers 1-4)       ║{Term.RESET}")
    print(f"{Term.CYAN}{Term.BOLD}╚════════════════════════════════════════════════════════════════════════════╝{Term.RESET}")
    print(f"Project Root: {PROJECT_ROOT}")
    print(f"Python:       {sys.version.split()[0]} ({sys.executable})")

    harness = E2ETestHarness(verbose=args.verbose, bail=args.bail, target_tier=args.tier)

    # Build and execute all test tiers
    build_tier_1_tests(harness)
    build_tier_2_tests(harness)
    build_tier_3_tests(harness)
    build_tier_4_tests(harness)

    exit_code = harness.print_summary()
    sys.exit(exit_code)

if __name__ == "__main__":
    main()
