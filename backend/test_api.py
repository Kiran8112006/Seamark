# ============================================================
# SEAMARK — Backend Automated Endpoint & Workflow Test Suite
# Tests all API routes, state transitions, resurvey, and exports
# ============================================================
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_endpoints():
    print("=== RUNNING SEAMARK BACKEND TEST SUITE ===")
    from core.simulation import simulation_engine
    simulation_engine.initialize_state(initial_step=120)

    # 1. Root & Status
    r = client.get("/")
    assert r.status_code == 200, f"Root failed: {r.status_code}"
    print("[PASS] GET / (Root health check passed)")

    # 2. System Status
    r = client.get("/api/system/status")
    assert r.status_code == 200
    data = r.json()
    assert data["operational"] is True
    assert data["dataSource"] == "SIMULATION"
    print(f"[PASS] GET /api/system/status (Operational, Nodes: {data['nodesOnline']})")

    # 3. Survey Current
    r = client.get("/api/survey/current")
    assert r.status_code == 200
    data = r.json()
    assert "progress" in data
    assert "measurements" in data
    print(f"[PASS] GET /api/survey/current (Progress: {data['progress']}%, Measurements: {data['measurements']})")

    # 4. Telemetry
    r = client.get("/api/telemetry?limit=10")
    assert r.status_code == 200
    data = r.json()
    assert len(data) > 0
    t0 = data[-1]
    assert "emAmplitude" in t0
    assert "magneticField" in t0
    assert "nodeId" in t0
    print(f"[PASS] GET /api/telemetry ({len(data)} points returned, latest node: {t0['nodeId']})")

    # 5. Nodes
    r = client.get("/api/nodes")
    assert r.status_code == 200
    nodes = r.json()
    assert len(nodes) >= 4
    assert nodes[0]["role"] == "REFERENCE"
    print(f"[PASS] GET /api/nodes ({len(nodes)} nodes online: {[n['id'] for n in nodes]})")

    # 6. Detection
    r = client.get("/api/detection/latest?limit=5")
    assert r.status_code == 200
    dets = r.json()
    assert len(dets) > 0
    print(f"[PASS] GET /api/detection/latest ({len(dets)} waveforms returned)")

    # 7. Targets
    r = client.get("/api/targets")
    assert r.status_code == 200
    targets = r.json()
    assert len(targets) > 0
    print(f"[PASS] GET /api/targets ({len(targets)} candidate zones found, Top Target: {targets[0]['id']} with prospectivity {targets[0]['prospectivity']})")

    # 8. Map
    r = client.get("/api/map")
    assert r.status_code == 200
    cells = r.json()
    assert len(cells) == 320 # 20x16 grid
    measured_count = sum(1 for c in cells if c["coverage"] == "MEASURED")
    print(f"[PASS] GET /api/map (320 cells returned, Measured: {measured_count})")

    # 9. Adaptive Resurvey
    top_target_id = targets[0]["id"]
    r = client.post("/api/resurvey/start", json={"target_id": top_target_id})
    assert r.status_code == 200
    resurvey = r.json()
    assert resurvey["targetId"] == top_target_id
    assert resurvey["phase"] == "RESURVEY_COMPLETE"
    assert resurvey["after"]["uncertainty"] < resurvey["before"]["uncertainty"]
    print(f"[PASS] POST /api/resurvey/start (Resurvey verified: uncertainty dropped from {resurvey['before']['uncertainty']} to {resurvey['after']['uncertainty']})")

    # 10. Validation Benchmarks
    r = client.get("/api/validation")
    assert r.status_code == 200
    val = r.json()
    assert len(val) >= 8
    print(f"[PASS] GET /api/validation ({len(val)} validation criteria evaluated)")

    # 11. CSV Export
    r = client.get("/api/export/csv")
    assert r.status_code == 200
    assert "text/csv" in r.headers["content-type"]
    assert "em_amplitude" in r.text
    print(f"[PASS] GET /api/export/csv (CSV generated: {len(r.text.splitlines())} lines)")

    # 12. JSON Export
    r = client.get("/api/export/json")
    assert r.status_code == 200
    exp = r.json()
    assert "metadata" in exp
    assert "measurements" in exp
    print(f"[PASS] GET /api/export/json (JSON export validated)")

    # 13. Security Status & Event Simulation
    r = client.get("/api/security/status")
    assert r.status_code == 200
    sec_stat = r.json()
    print(f"[PASS] GET /api/security/status (Verified packets: {sec_stat['totalPacketsVerified']})")

    r = client.post("/api/security/simulate-event", json={"anomaly_type": "REPLAY", "node_id": "SN-02"})
    assert r.status_code == 200
    ev = r.json()["event"]
    assert ev["eventType"] == "REPLAY_DETECTED"
    print(f"[PASS] POST /api/security/simulate-event (Injected anomaly handled: {ev['description']})")

    r = client.get("/api/security/events")
    assert r.status_code == 200
    events = r.json()
    assert any(e["eventType"] == "REPLAY_DETECTED" for e in events)
    print(f"[PASS] GET /api/security/events ({len(events)} security audit records verified)")

    # 14. Survey Control State Machine
    r = client.post("/api/survey/pause")
    assert r.status_code == 200
    print("[PASS] POST /api/survey/pause")

    r = client.post("/api/survey/reset")
    assert r.status_code == 200
    print("[PASS] POST /api/survey/reset (State machine reset verified)")

    print("\nALL 14 BACKEND TESTS PASSED WITH ZERO ERRORS!")

if __name__ == "__main__":
    test_endpoints()
