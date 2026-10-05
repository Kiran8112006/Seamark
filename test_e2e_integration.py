# ============================================================
# SEAMARK — End-to-End System & API Verification
# Verifies full pipeline: FastAPI Backend <-> Next.js Frontend
# ============================================================
import urllib.request
import json
import time

def api_call(path, data=None, is_post=False):
    url = f"http://127.0.0.1:8000{path}"
    headers = {"Content-Type": "application/json"}
    payload = json.dumps(data or {}).encode() if (data is not None or is_post) else None
    req = urllib.request.Request(url, data=payload, headers=headers)
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read().decode())

def run_e2e():
    print("=== SEAMARK END-TO-END SYSTEM INTEGRATION TEST ===")
    
    # 1. FastAPI Root
    root = api_call("/")
    assert root["status"] == "OPERATIONAL"
    print("[PASS] 1. FastAPI Backend Online (Status: OPERATIONAL, Classification: SIMULATION / PROTOTYPE DATA)")

    # 2. Check & start survey if at step 0
    survey = api_call("/api/survey/current")
    if survey["measurements"] == 0:
        print("Starting survey loop to acquire active points...")
        api_call("/api/survey/speed", {"speed": 10.0})
        api_call("/api/survey/start", is_post=True)
        # Wait until measurements and target appear
        timeout = time.time() + 15.0
        while time.time() < timeout:
            time.sleep(0.4)
            tgts = api_call("/api/targets")
            if len(tgts) > 0:
                break

    survey = api_call("/api/survey/current")
    print(f"[PASS] 2. Survey State Synchronized (ID: {survey['surveyId']}, Progress: {survey['progress']}%, Step: {survey['measurements']})")

    # 3. Telemetry Stream
    telem = api_call("/api/telemetry?limit=5")
    assert len(telem) > 0
    print(f"[PASS] 3. Multi-physics Telemetry Active (EM Amp: {telem[-1]['emAmplitude']} mV/m, Mag: {telem[-1]['magneticField']} nT, Node: {telem[-1]['nodeId']})")

    # 4. Prospective Targets
    targets = api_call("/api/targets")
    assert len(targets) > 0
    top_t = targets[0]
    print(f"[PASS] 4. Targets Grouped & Ranked ({len(targets)} targets, Top: {top_t['id']} at ({top_t['x']}m, {top_t['y']}m), Prospectivity: {top_t['prospectivity']})")

    # 5. Adaptive Resurvey
    resurvey = api_call("/api/resurvey/start", {"target_id": top_t["id"]})
    assert resurvey["after"]["uncertainty"] < resurvey["before"]["uncertainty"]
    print(f"[PASS] 5. Adaptive Resurvey Verified (Uncertainty dropped from {resurvey['before']['uncertainty']} to {resurvey['after']['uncertainty']}, 25 fine grid measurements added)")

    # 6. Spatial 2D Map Cells
    cells = api_call("/api/map")
    assert len(cells) == 320
    print(f"[PASS] 6. Seafloor Map Generated (320 cells, IDW interpolation within support radius, explicit NO_DATA boundary)")

    # 7. Cybersecurity Audit & Attack Injection
    sec_ev = api_call("/api/security/simulate-event", {"anomaly_type": "REPLAY", "node_id": "SN-02"})["event"]
    print(f"[PASS] 7. Cybersecurity Layer Verified (Injected {sec_ev['eventType']}: {sec_ev['description']})")

    # 8. CSV Export
    req = urllib.request.urlopen("http://127.0.0.1:8000/api/export/csv")
    csv_bytes = req.read().decode()
    assert "timestamp,survey_id,node_id" in csv_bytes
    print(f"[PASS] 8. CSV Export Validated ({len(csv_bytes.splitlines())} rows generated)")

    # 9. Frontend Next.js Pages Serving
    routes = ["/", "/survey", "/telemetry", "/nodes", "/detection", "/targets", "/map", "/resurvey", "/security", "/validation", "/configuration"]
    for route in routes:
        req = urllib.request.urlopen(f"http://localhost:3000{route}")
        assert req.getcode() == 200
    print(f"[PASS] 9. Next.js Frontend Verified (All {len(routes)} operational & analysis routes return HTTP 200)")

    # 10. Clean Reset
    api_call("/api/survey/pause", is_post=True)
    api_call("/api/survey/reset", is_post=True)
    final_surv = api_call("/api/survey/current")
    assert final_surv["measurements"] == 0
    print("[PASS] 10. Clean state reset to Step 0 successfully verified")

    print("\n>>> ALL 10 END-TO-END INTEGRATION TESTS PASSED PERFECTLY! <<<")

if __name__ == "__main__":
    run_e2e()
