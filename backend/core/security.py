# ============================================================
# SEAMARK — Cybersecurity & Cryptographic Packet Integrity Engine
# SIH 2026 Problem Statement: 26064
# ============================================================
import hashlib
import hmac
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple
import os
from pathlib import Path

try:
    from dotenv import load_dotenv
    env_candidate = Path(__file__).resolve().parent.parent / ".env"
    if env_candidate.exists():
        load_dotenv(dotenv_path=env_candidate)
    else:
        load_dotenv()
except ImportError:
    pass

from models.schemas import SecurityEvent, SecurityStatus

AUTHORIZED_NODES = {"SN-00", "SN-01", "SN-02", "SN-03"}

def get_hmac_master_secret() -> bytes:
    secret = os.environ.get("SEAMARK_HMAC_SECRET")
    if not secret or not secret.strip():
        raise RuntimeError(
            "CRITICAL SECURITY CONFIGURATION ERROR: 'SEAMARK_HMAC_SECRET' environment variable is missing or empty. "
            "Please configure SEAMARK_HMAC_SECRET in your environment or backend/.env file."
        )
    return secret.strip().encode("utf-8")

def get_node_key(node_id: str) -> bytes:
    """Derives a per-node cryptographic authentication key from SEAMARK_HMAC_SECRET."""
    master_secret = get_hmac_master_secret()
    return hashlib.sha256(master_secret + f":{node_id}".encode("utf-8")).digest()

class SecurityEngine:
    def __init__(self):
        # Validate that SEAMARK_HMAC_SECRET is set at startup
        get_hmac_master_secret()
        self.node_seq_counters: Dict[str, int] = {nid: 1000 for nid in AUTHORIZED_NODES}
        self.seen_packet_hashes: set = set()
        self.audit_log: List[SecurityEvent] = []
        self.total_verified = 0
        self.sequence_gaps = 0
        self.replay_attempts = 0
        self.unauthorized_attempts = 0

        # Initial baseline event
        self.log_event(
            event_type="CONFIGURATION_VERIFIED",
            severity="INFO",
            node_id="SYSTEM",
            description="Seamark cryptographic root keys and node identities verified."
        )

    def reset(self):
        """Restores security engine to clean initial state."""
        self.node_seq_counters = {nid: 1000 for nid in AUTHORIZED_NODES}
        self.seen_packet_hashes = set()
        self.audit_log.clear()
        self.total_verified = 0
        self.sequence_gaps = 0
        self.replay_attempts = 0
        self.unauthorized_attempts = 0
        self.log_event(
            event_type="CONFIGURATION_VERIFIED",
            severity="INFO",
            node_id="SYSTEM",
            description="Seamark cryptographic root keys and node identities verified."
        )

    def log_event(self, event_type: str, severity: str, node_id: str, description: str) -> SecurityEvent:
        event = SecurityEvent(
            id=f"SEC-{len(self.audit_log) + 1:04d}",
            timestamp=datetime.now(timezone.utc).isoformat(),
            eventType=event_type,
            severity=severity,
            nodeId=node_id,
            description=description
        )
        self.audit_log.append(event)
        # Cap log size to 100 entries
        if len(self.audit_log) > 100:
            self.audit_log.pop(0)
        return event

    def create_packet_signature(self, node_id: str, seq: int, payload_str: str) -> str:
        key = get_node_key(node_id)
        raw = f"{node_id}:{seq}:{payload_str}".encode('utf-8')
        return hmac.new(key, raw, hashlib.sha256).hexdigest()[:16]

    def verify_incoming_packet(
        self,
        node_id: str,
        sequence_number: int,
        payload_hash: str,
        signature: str,
        payload_str: str
    ) -> Tuple[bool, str]:
        """
        Validates telemetry packet integrity, authentication, sequence order, and replay defense.
        """
        # 1. Node Authorization check
        if node_id not in AUTHORIZED_NODES:
            self.unauthorized_attempts += 1
            self.log_event(
                event_type="INVALID_NODE",
                severity="ALERT",
                node_id=node_id,
                description=f"Rejected transmission from unauthorized node identifier '{node_id}'."
            )
            return False, "INVALID_NODE"

        # 2. Replay detection (duplicate hash)
        if payload_hash in self.seen_packet_hashes:
            self.replay_attempts += 1
            self.log_event(
                event_type="REPLAY_DETECTED",
                severity="ALERT",
                node_id=node_id,
                description=f"Duplicate packet hash detected for {node_id} (seq {sequence_number}). Possible replay attack."
            )
            return False, "REPLAY_DETECTED"

        # 3. Sequence counter checking
        last_seq = self.node_seq_counters.get(node_id, 0)
        if sequence_number <= last_seq:
            self.replay_attempts += 1
            self.log_event(
                event_type="REPLAY_DETECTED",
                severity="WARNING",
                node_id=node_id,
                description=f"Sequence rollback detected for {node_id}: received seq {sequence_number} <= expected > {last_seq}."
            )
            return False, "REPLAY_DETECTED"
        elif sequence_number > last_seq + 1:
            self.sequence_gaps += 1
            self.log_event(
                event_type="SEQUENCE_GAP",
                severity="WARNING",
                node_id=node_id,
                description=f"Acoustic packet loss detected for {node_id}: sequence jumped from {last_seq} to {sequence_number}."
            )

        # 4. Cryptographic HMAC validation
        expected_sig = self.create_packet_signature(node_id, sequence_number, payload_str)
        if not hmac.compare_digest(signature, expected_sig):
            self.log_event(
                event_type="COMMUNICATION_DEGRADED",
                severity="ALERT",
                node_id=node_id,
                description=f"Cryptographic HMAC signature mismatch on packet from {node_id}."
            )
            return False, "CORRUPTED"

        # Accept packet
        self.node_seq_counters[node_id] = sequence_number
        self.seen_packet_hashes.add(payload_hash)
        self.total_verified += 1
        
        # Periodic verification log (every 25 packets)
        if self.total_verified % 25 == 0:
            self.log_event(
                event_type="TELEMETRY_VERIFIED",
                severity="INFO",
                node_id=node_id,
                description=f"Telemetry packet block {sequence_number} cryptographically authenticated and accepted."
            )

        return True, "VERIFIED"

    def simulate_security_anomaly(self, anomaly_type: str, node_id: str = "SN-02") -> SecurityEvent:
        """
        Interactive demonstration trigger for hackathon presentation.
        """
        if anomaly_type == "REPLAY":
            self.replay_attempts += 1
            return self.log_event(
                event_type="REPLAY_DETECTED",
                severity="ALERT",
                node_id=node_id,
                description=f"Simulated acoustic replay intercept: packet re-transmitted with expired sequence number {self.node_seq_counters.get(node_id, 1000) - 2}."
            )
        elif anomaly_type == "GAP":
            self.sequence_gaps += 1
            curr_seq = self.node_seq_counters.get(node_id, 1000)
            self.node_seq_counters[node_id] = curr_seq + 5
            return self.log_event(
                event_type="SEQUENCE_GAP",
                severity="WARNING",
                node_id=node_id,
                description=f"Simulated acoustic packet drop: gap detected between sequence #{curr_seq} and #{curr_seq + 5}."
            )
        elif anomaly_type == "UNKNOWN_NODE":
            self.unauthorized_attempts += 1
            return self.log_event(
                event_type="INVALID_NODE",
                severity="ALERT",
                node_id="ROGUE-99",
                description="Simulated acoustic breach: unrecognized device identifier 'ROGUE-99' rejected by base node."
            )
        elif anomaly_type == "DEGRADED":
            return self.log_event(
                event_type="COMMUNICATION_DEGRADED",
                severity="WARNING",
                node_id=node_id,
                description=f"Acoustic thermocline distortion: SNR dropped below 8 dB on {node_id} uplink."
            )
        else:
            return self.log_event(
                event_type="CONFIGURATION_VERIFIED",
                severity="INFO",
                node_id="SYSTEM",
                description="Manual cryptographic integrity check requested: all node keyrings valid."
            )

    def get_status(self) -> SecurityStatus:
        last_ev = self.audit_log[-1].description if self.audit_log else "Nominal"
        integrity = "NOMINAL"
        if self.replay_attempts > 0 or self.unauthorized_attempts > 0:
            integrity = "DEFENSE_ACTIVE"

        return SecurityStatus(
            totalPacketsVerified=self.total_verified,
            sequenceGaps=self.sequence_gaps,
            replayAttemptsBlocked=self.replay_attempts,
            unauthorizedNodesBlocked=self.unauthorized_attempts,
            lastAuditEvent=last_ev,
            cryptographicIntegrity=integrity
        )

security_engine = SecurityEngine()
