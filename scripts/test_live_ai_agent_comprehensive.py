import urllib.request
import urllib.error
import json
import time
import sys

# Force UTF-8
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE_URL = "https://dashboard.asquared.ae/dashboard/api_ai_agent.php"

def run_test(title, payload, method="POST", query_params=""):
    print(f"\n{'='*60}")
    print(f"TEST: {title}")
    url = BASE_URL + (f"?{query_params}" if query_params else "")
    print(f"URL: {url} [{method}]")
    if method == "POST":
        print(f"PAYLOAD: {json.dumps(payload)}")
    print(f"{'='*60}")

    headers = {"Content-Type": "application/json"}
    data = json.dumps(payload).encode("utf-8") if method == "POST" else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)

    try:
        start = time.time()
        with urllib.request.urlopen(req, timeout=40) as response:
            status_code = response.getcode()
            body = response.read().decode("utf-8")
            elapsed = time.time() - start

            print(f"HTTP Status: {status_code} ({elapsed:.2f}s)")
            try:
                res_json = json.loads(body)
                print(f"Success: {res_json.get('success')}")
                if "execution_id" in res_json:
                    print(f"Execution ID: {res_json['execution_id']}")

                print("Pipeline Events:")
                for ev in res_json.get("pipeline_events", []):
                    icon = "✓" if ev.get("status") in ["completed", "running"] else ("⚠" if ev.get("status") == "blocked" else "✗")
                    print(f"  {icon} [{ev.get('step')}] {ev.get('title')}: {ev.get('detail')}")

                print("\nTool Calls:")
                for tc in res_json.get("tool_calls", []):
                    print(f"  • Tool: {tc.get('tool')} | Status: {tc.get('status')}")

                print(f"\nResponse Markdown Preview (first 500 chars):\n")
                preview = res_json.get("message", "")[:500]
                print(preview)
                if len(res_json.get("message", "")) > 500:
                    print("... [TRUNCATED FOR DISPLAY]")

                return res_json
            except Exception as e:
                print(f"JSON Parse Error: {e}")
                print(f"Raw Output: {body[:300]}")
                return None
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        print(f"HTTP Error {e.code}: {body}")
        try:
            return json.loads(body)
        except:
            return None
    except Exception as e:
        print(f"Request Exception: {e}")
        return None

# ==============================================================================
# TEST RUNS
# ==============================================================================

print("STARTING ACCEPTANCE TEST SUITE ON LIVE HOSTINGER ENVIRONMENT...\n")

# TEST 1: Simple Read
t1_res = run_test(
    "Test 1: Simple Read (Market / Buildings Directory)",
    {"messages": [{"role": "user", "content": "Show me buildings in Dubai Marina"}]}
)

# TEST 2: Cross-Domain Request
t2_res = run_test(
    "Test 2: Cross-Domain Request (Owners + Call Audio Intelligence)",
    {"messages": [{"role": "user", "content": "Find Marina owners who haven't been contacted in 30 days and analyse their call history"}]}
)

# TEST 3: CRM Mutation (High-Impact Guardrail)
t3_res = run_test(
    "Test 3: CRM Mutation Guardrail (Push to Bitrix CRM)",
    {"messages": [{"role": "user", "content": "Push lead LEAD-1763175 to Vikram in Bitrix CRM"}]}
)

# TEST 4: Daily Call Audit PDF
t4_res = run_test(
    "Test 4: Daily Call Audit Report (PDF Download Link)",
    {"messages": [{"role": "user", "content": "Show me the daily call audit report"}]}
)

# TEST 5: Reconnection & State Recovery
exec_id = t2_res.get("execution_id") if t2_res else None
if exec_id:
    t5_res = run_test(
        f"Test 5: Reconnection & Execution State Recovery (ID: {exec_id})",
        {},
        method="GET",
        query_params=f"action=status&id={exec_id}"
    )

# TEST 6: Feature Regression & Assets Availability
print(f"\n{'='*60}")
print("TEST 6: Dashboard Feature Regressions & Asset Availability")
print(f"{'='*60}")
assets_to_test = [
    "https://dashboard.asquared.ae/dashboard/",
    "https://dashboard.asquared.ae/dashboard/assets/vendor-icons-B64rQQ5y.js",
    "https://dashboard.asquared.ae/dashboard/assets/AIAgent-B5_OeGGB.js",
    "https://dashboard.asquared.ae/dashboard/audits/AS_PROPERTIES_DAILY_CALL_AUDIT_20261013.pdf"
]

for asset in assets_to_test:
    try:
        req = urllib.request.Request(asset, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            content_type = resp.headers.get("Content-Type", "")
            print(f"  ✓ {asset} -> HTTP {resp.status} ({content_type})")
    except Exception as e:
        print(f"  ✗ {asset} -> Error: {e}")

print("\nALL VERIFICATION TESTS COMPLETED.")
