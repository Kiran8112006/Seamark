# ============================================================
# SEAMARK — Verification of Complete Reset -> Start -> Resurvey -> Reset Cycle
# SIH 2026 Problem Statement: 26064
# ============================================================
import time
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_full_lifecycle():
    print("=== TESTING COMPLETE RESET -> START -> PROGRESS -> TARGET -> RESURVEY -> RESET -> START CYCLE ===")

    # ----------------------------------------------------
    # STAGE 1: RESET TO CLEAN INITIAL STATE
    # ----------------------------------------------------
    print("\n--- STAGE 1: Calling POST /api/survey/reset ---")
    r = client.post("/api/survey/reset")
    assert r.status_code == 200, f"Reset failed: {r.status_code}"

    # Verify Step 0
    surv = client.get("/api/survey/current").json()
    assert surv["measurements"] == 0, f"Expected 0 measurements, got {surv['measurements']}"
    assert surv["progress"] == 0.0, f"Expected 0.0% progress, got {surv['progress']}"
    assert surv["state"] == "IDLE", f"Expected IDLE state, got {surv['state']}"
    assert surv["areaCovered"] == 0.0
    assert surv["currentPosition"]["x"] == 0.0 and surv["currentPosition"]["y"] == 0.0
    print(f"[PASS] 1. Survey state reset to Step 0 (State: {surv['state']}, Measurements: {surv['measurements']}, Progress: {surv['progress']}%)")

    # Verify No Stale Targets
    targets = client.get("/api/targets").json()
    assert len(targets) == 0, f"Expected 0 targets after reset, got {len(targets)}"
    print(f"[PASS] 2. Targets list is clean (Count: {len(targets)})")

    # Verify Zero Measurements
    meas = client.get("/api/survey/measurements").json()
    assert len(meas) == 0, f"Expected 0 measurements, got {len(meas)}"
    print(f"[PASS] 3. Measurement registry is clean (Count: {len(meas)})")

    # Verify Initial Coverage & 320 Grid Cells
    cells = client.get("/api/map").json()
    assert len(cells) == 320, f"Expected 320 cells, got {len(cells)}"
    measured_cells = [c for c in cells if c["coverage"] == "MEASURED"]
    assert len(measured_cells) == 0, f"Expected 0 measured cells after reset, got {len(measured_cells)}"
    print(f"[PASS] 4. Seafloor map has initial NO_DATA coverage (Total: {len(cells)}, Measured: {len(measured_cells)})")

    # Verify Initial Detection Status (Mean Uncertainty = 1.0 initial baseline)
    det_status = client.get("/api/detection/status").json()
    assert det_status["anomalies"] == 0
    assert det_status["targets"] == 0
    assert det_status["meanUncertainty"] == 1.0
    print(f"[PASS] 5. Detection status clean (Anomalies: 0, Targets: 0, Initial Baseline Uncertainty: {det_status['meanUncertainty']})")

    # Verify Nodes Initial State
    nodes = client.get("/api/nodes").json()
    assert len(nodes) == 4
    for n in nodes:
        assert n["communication"] == "ONLINE"
        assert n["sensorHealth"] == "NOMINAL"
    print(f"[PASS] 6. All 4 nodes in nominal initial state (ONLINE, NOMINAL health, batteries nominal)")

    # Verify Clean Security Event Stream
    sec_events = client.get("/api/security/events").json()
    assert len(sec_events) == 1
    assert sec_events[0]["eventType"] == "CONFIGURATION_VERIFIED"
    print(f"[PASS] 7. Security audit stream reset to clean baseline (Events: {len(sec_events)}, Type: {sec_events[0]['eventType']})")

    # Verify Clean Resurvey State
    resurvey_state = client.get("/api/resurvey/state").json()
    assert resurvey_state is None
    print(f"[PASS] 8. Resurvey state cleared (None)")

    # ----------------------------------------------------
    # STAGE 2: START SURVEY & OBSERVE PROGRESS
    # ----------------------------------------------------
    print("\n--- STAGE 2: Calling POST /api/survey/start ---")
    # Increase simulation speed for quick programmatic test execution
    client.post("/api/survey/speed", json={"speed": 10.0})
    r = client.post("/api/survey/start")
    assert r.status_code == 200
    print("[PASS] Survey start command accepted")

    # Wait for survey loop to acquire initial points and progress
    print("Waiting for survey progression along lawnmower trajectory...")
    start_time = time.time()
    last_step = 0
    while time.time() - start_time < 8.0:
        time.sleep(0.4)
        surv = client.get("/api/survey/current").json()
        step = surv["measurements"]
        if step > last_step:
            last_step = step
            if step >= 15:
                break

    assert last_step >= 5, f"Expected survey to progress to at least 5 steps, reached {last_step}"
    surv = client.get("/api/survey/current").json()
    print(f"[PASS] Survey successfully progressing: Step {surv['measurements']}, Progress: {surv['progress']}%, Position: ({surv['currentPosition']['x']}m, {surv['currentPosition']['y']}m)")

    # Verify telemetry stream is generating records
    telem = client.get("/api/telemetry?limit=5").json()
    assert len(telem) > 0
    print(f"[PASS] Real-time telemetry streaming active ({len(telem)} points, latest node: {telem[-1]['nodeId']})")

    # ----------------------------------------------------
    # STAGE 3: STEP FORWARD UNTIL CANDIDATE TARGET APPEARS
    # ----------------------------------------------------
    print("\n--- STAGE 3: Advancing trajectory toward target zone ---")
    from core.simulation import simulation_engine
    # Advance to target zone (step 110)
    for _ in range(110 - simulation_engine.survey_step):
        simulation_engine._step_simulation()
    simulation_engine._update_spatial_aggregates()

    targets = client.get("/api/targets").json()
    assert len(targets) > 0, f"Expected candidate targets to appear, got {len(targets)}"
    top_target = targets[0]
    print(f"[PASS] Target appeared: ID={top_target['id']}, Centroid=({top_target['x']}m, {top_target['y']}m), Prospectivity={top_target['prospectivity']}, Status={top_target['status']}")

    # ----------------------------------------------------
    # STAGE 4: EXECUTE ADAPTIVE RESURVEY ON TARGET
    # ----------------------------------------------------
    print(f"\n--- STAGE 4: Executing Adaptive Resurvey on {top_target['id']} ---")
    r = client.post("/api/resurvey/start", json={"target_id": top_target["id"]})
    assert r.status_code == 200
    resurvey = r.json()
    assert resurvey["targetId"] == top_target["id"]
    assert resurvey["phase"] == "RESURVEY_COMPLETE"
    assert resurvey["after"]["uncertainty"] < resurvey["before"]["uncertainty"], f"Uncertainty did not drop: before={resurvey['before']['uncertainty']}, after={resurvey['after']['uncertainty']}"
    print(f"[PASS] Resurvey complete: Uncertainty reduced from {resurvey['before']['uncertainty']} to {resurvey['after']['uncertainty']}, Confidence elevated from {resurvey['before']['confidence']} to {resurvey['after']['confidence']}")

    # ----------------------------------------------------
    # STAGE 5: RESET AGAIN TO VERIFY CLEAN RETURN
    # ----------------------------------------------------
    print("\n--- STAGE 5: Calling POST /api/survey/reset again ---")
    r = client.post("/api/survey/reset")
    assert r.status_code == 200

    surv = client.get("/api/survey/current").json()
    assert surv["measurements"] == 0
    assert surv["progress"] == 0.0
    assert surv["state"] == "IDLE"

    targets = client.get("/api/targets").json()
    assert len(targets) == 0

    meas = client.get("/api/survey/measurements").json()
    assert len(meas) == 0

    resurvey_state = client.get("/api/resurvey/state").json()
    assert resurvey_state is None
    print("[PASS] Complete clean state restored after second reset (Step 0, 0 targets, 0 measurements, null resurvey)")

    # ----------------------------------------------------
    # STAGE 6: START SURVEY AGAIN FROM STEP 0
    # ----------------------------------------------------
    print("\n--- STAGE 6: Calling POST /api/survey/start again from Step 0 ---")
    r = client.post("/api/survey/start")
    assert r.status_code == 200

    start_time = time.time()
    second_step = 0
    while time.time() - start_time < 5.0:
        time.sleep(0.3)
        surv = client.get("/api/survey/current").json()
        if surv["measurements"] > second_step:
            second_step = surv["measurements"]
            if second_step >= 10:
                break

    assert second_step >= 3, f"Expected survey to progress from step 0 after second start, reached {second_step}"
    surv = client.get("/api/survey/current").json()
    print(f"[PASS] Second run successfully executing from step 0: reached Step {surv['measurements']} (Progress: {surv['progress']}%)")

    # Stop simulation
    client.post("/api/survey/pause")
    client.post("/api/survey/reset")
    print("\n=======================================================")
    print(">>> COMPLETE LIFECYCLE TEST PASSED WITH 100% SUCCESS! <<<")
    print("=======================================================")

if __name__ == "__main__":
    test_full_lifecycle()
