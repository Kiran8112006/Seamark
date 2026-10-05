# ============================================================
# SEAMARK — Live Server Lifecycle Verification
# Tests against running FastAPI daemon: RESET -> START -> PROGRESS -> TARGET -> RESURVEY -> RESET -> START
# ============================================================
import urllib.request
import json
import time

BASE_URL = "http://127.0.0.1:8000/api"

def api_get(endpoint):
    req = urllib.request.Request(f"{BASE_URL}{endpoint}")
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read().decode())

def api_post(endpoint, data=None):
    payload = json.dumps(data).encode() if data is not None else b"{}"
    req = urllib.request.Request(
        f"{BASE_URL}{endpoint}",
        data=payload,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as res:
        return json.loads(res.read().decode())

def run_live_lifecycle():
    print("=== TESTING COMPLETE RESET -> START -> PROGRESS -> TARGET -> RESURVEY -> RESET -> START CYCLE (LIVE SERVER) ===")

    # 1. Reset to Step 0
    print("\n[1] Calling POST /api/survey/reset...")
    r = api_post("/survey/reset")
    print("Reset response:", r)

    surv = api_get("/survey/current")
    assert surv["measurements"] == 0, f"Expected 0 measurements, got {surv['measurements']}"
    assert surv["progress"] == 0.0, f"Expected 0.0 progress, got {surv['progress']}"
    assert surv["state"] == "IDLE", f"Expected IDLE, got {surv['state']}"
    print(f"[PASS] 1. Survey reset to clean Step 0: measurements={surv['measurements']}, state={surv['state']}")

    targets = api_get("/targets")
    assert len(targets) == 0, f"Expected 0 targets, got {len(targets)}"
    print(f"[PASS] 2. No stale targets: {len(targets)} targets")

    meas = api_get("/survey/measurements")
    assert len(meas) == 0, f"Expected 0 measurements, got {len(meas)}"
    print(f"[PASS] 3. Measurement registry clean: {len(meas)} measurements")

    cells = api_get("/map")
    assert len(cells) == 320
    measured = [c for c in cells if c["coverage"] == "MEASURED"]
    assert len(measured) == 0
    print(f"[PASS] 4. Seafloor map initial state: 320 cells, 0 measured")

    det_status = api_get("/detection/status")
    assert det_status["anomalies"] == 0
    assert det_status["targets"] == 0
    assert det_status["meanUncertainty"] == 1.0
    print(f"[PASS] 5. Detection status clean: anomalies=0, targets=0, initial uncertainty={det_status['meanUncertainty']}")

    nodes = api_get("/nodes")
    assert len(nodes) == 4
    for n in nodes:
        assert n["communication"] == "ONLINE"
        assert n["sensorHealth"] == "NOMINAL"
    print(f"[PASS] 6. Nodes in initial nominal state: 4 nodes online")

    events = api_get("/security/events")
    assert len(events) == 1
    assert events[0]["eventType"] == "CONFIGURATION_VERIFIED"
    print(f"[PASS] 7. Security audit stream reset: 1 baseline event ({events[0]['eventType']})")

    resurvey_state = api_get("/resurvey/state")
    assert resurvey_state is None
    print(f"[PASS] 8. Resurvey state cleared: {resurvey_state}")

    # 2. Start Survey and observe real-time progression
    print("\n[2] Setting speed to 5x and calling POST /api/survey/start...")
    api_post("/survey/speed", {"speed": 5.0})
    api_post("/survey/start")

    print("Observing survey progression on live server...")
    prev_step = 0
    step_history = []
    for _ in range(12):
        time.sleep(0.3)
        surv = api_get("/survey/current")
        cur_step = surv["measurements"]
        if cur_step != prev_step:
            step_history.append(cur_step)
            prev_step = cur_step
        if cur_step >= 12:
            break

    assert len(step_history) >= 4, f"Expected survey to progress over multiple steps, recorded {step_history}"
    print(f"[PASS] Survey progressing smoothly in real time: Step progression {step_history[:8]}...")

    # 3. Fast-forward speed to reach target zone and watch target appear
    print("\n[3] Setting speed to 10x to reach target zone...")
    api_post("/survey/speed", {"speed": 10.0})
    
    timeout = time.time() + 15.0
    found_targets = []
    while time.time() < timeout:
        time.sleep(0.5)
        found_targets = api_get("/targets")
        surv = api_get("/survey/current")
        print(f"   Current Survey Step: {surv['measurements']}, Targets: {len(found_targets)}")
        if len(found_targets) > 0:
            break

    assert len(found_targets) > 0, "Expected candidate target to appear as survey progressed over anomaly zone"
    top_t = found_targets[0]
    print(f"[PASS] Target appeared: ID={top_t['id']}, Centroid=({top_t['x']}m, {top_t['y']}m), Prospectivity={top_t['prospectivity']}, Status={top_t['status']}")

    # 4. Execute Adaptive Resurvey
    print(f"\n[4] Executing Adaptive Resurvey on target {top_t['id']}...")
    resurvey = api_post("/resurvey/start", {"target_id": top_t["id"]})
    assert resurvey["targetId"] == top_t["id"]
    assert resurvey["phase"] == "RESURVEY_COMPLETE"
    assert resurvey["after"]["uncertainty"] < resurvey["before"]["uncertainty"], f"Uncertainty did not drop: before={resurvey['before']['uncertainty']}, after={resurvey['after']['uncertainty']}"
    print(f"[PASS] Resurvey complete: Uncertainty reduced from {resurvey['before']['uncertainty']} to {resurvey['after']['uncertainty']}, Confidence elevated to {resurvey['after']['confidence']}")

    # 5. Reset to Step 0 again
    print("\n[5] Calling POST /api/survey/reset again...")
    api_post("/survey/reset")

    surv = api_get("/survey/current")
    assert surv["measurements"] == 0, f"Expected 0 measurements after reset, got {surv['measurements']}"
    assert surv["progress"] == 0.0
    assert surv["state"] == "IDLE"

    targets = api_get("/targets")
    assert len(targets) == 0, f"Expected 0 targets after reset, got {len(targets)}"

    meas = api_get("/survey/measurements")
    assert len(meas) == 0

    resurvey_state = api_get("/resurvey/state")
    assert resurvey_state is None
    print("[PASS] Complete clean state restored: Step 0, 0 targets, 0 measurements, null resurvey")

    # 6. Start survey again from Step 0
    print("\n[6] Calling POST /api/survey/start again from Step 0...")
    api_post("/survey/speed", {"speed": 4.0})
    api_post("/survey/start")

    time.sleep(1.2)
    surv2 = api_get("/survey/current")
    assert surv2["measurements"] > 0, f"Expected survey to progress from step 0 after restart, got {surv2['measurements']}"
    print(f"[PASS] Survey successfully restarted from Step 0: currently at Step {surv2['measurements']} (Progress: {surv2['progress']}%)")

    # Clean up (pause & reset)
    api_post("/survey/pause")
    api_post("/survey/reset")
    print("\n=======================================================")
    print(">>> COMPLETE LIVE LIFECYCLE TEST VERIFIED WITH 100% SUCCESS! <<<")
    print("=======================================================")

if __name__ == "__main__":
    run_live_lifecycle()
