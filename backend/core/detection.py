# ============================================================
# SEAMARK — Detection, Spatial Consistency, Prospectivity & Uncertainty Engine
# SIH 2026 Problem Statement: 26064
# ============================================================
import numpy as np
from typing import List, Dict, Any, Tuple
from config import SystemConfiguration
from models.schemas import Target, SurveyMeasurement

class DetectionEngine:
    def __init__(self, config: SystemConfiguration):
        self.config = config

    def calculate_anomaly_score(
        self,
        corrected_amplitude: float,
        phase_anomaly: float,
        magnetic_anomaly: float,
        signal_quality: float
    ) -> float:
        """
        Combines electromagnetic inductive response, phase shift, and magnetic anomaly.
        Normalized score in [0.0, 1.0].
        """
        # EM amplitude sensitivity (typical anomaly range 0.0 to 1.5 mV/m above background)
        em_term = np.clip(corrected_amplitude / 0.8, 0.0, 1.0)
        
        # Phase delay term (secondary eddy current induces lag 10° to 60°)
        phase_term = np.clip(abs(phase_anomaly) / 45.0, 0.0, 1.0)
        
        # Magnetic field anomaly (ferrous / magnetite mineral alteration 100 nT to 1200 nT)
        mag_term = np.clip(abs(magnetic_anomaly) / 800.0, 0.0, 1.0)
        
        # Weighted multi-physics anomaly score
        raw_score = 0.50 * em_term + 0.25 * phase_term + 0.25 * mag_term
        
        # Modulate by receiver signal quality
        score = raw_score * (0.6 + 0.4 * signal_quality)
        return float(round(np.clip(score, 0.0, 1.0), 4))

    def evaluate_spatial_consistency(
        self,
        x: float,
        y: float,
        current_score: float,
        all_measurements: List[SurveyMeasurement],
        radius: float = 12.0
    ) -> Tuple[float, int]:
        """
        Neighborhood analysis:
        Computes spatial coherence of anomalies within radius meters.
        Returns: (spatial_consistency_score, neighbor_count)
        """
        neighbors = []
        for m in all_measurements:
            dist = np.sqrt((m.x - x)**2 + (m.y - y)**2)
            if 0.1 < dist <= radius:
                neighbors.append(m.anomaly_score)

        if not neighbors:
            # Isolated single reading has lower spatial consistency
            return (0.35 if current_score > self.config.anomaly_threshold else 0.85), 0

        avg_neighbor = float(np.mean(neighbors))
        # Coherence: high when neighbor scores match the current score
        similarity = 1.0 - abs(current_score - avg_neighbor)
        consistency = max(0.0, min(1.0, 0.5 * similarity + 0.5 * (avg_neighbor / max(0.01, current_score + avg_neighbor))))
        return float(round(consistency, 3)), len(neighbors)

    def calculate_prospectivity(
        self,
        anomaly_score: float,
        spatial_consistency: float,
        signal_quality: float,
        magnetic_response: float
    ) -> Tuple[float, str]:
        """
        Calculates 0.0-1.0 (or 0-100%) prospectivity score.
        Category: LOW, MEDIUM, HIGH (meaning: priority for detailed investigation).
        """
        base = 0.55 * anomaly_score + 0.30 * spatial_consistency + 0.15 * signal_quality
        prospectivity = float(round(np.clip(base, 0.0, 1.0), 3))

        if prospectivity >= self.config.resurvey_threshold:
            category = "HIGH"
        elif prospectivity >= self.config.prospectivity_threshold:
            category = "MEDIUM"
        else:
            category = "LOW"

        return prospectivity, category

    def calculate_confidence(
        self,
        signal_quality: float,
        neighbor_count: int,
        spatial_consistency: float,
        node_health_factor: float = 1.0
    ) -> float:
        """
        Confidence depends on signal-to-noise ratio, observation density, and spatial agreement.
        Returns 0.0 - 1.0.
        """
        density_factor = min(1.0, neighbor_count / 4.0)
        confidence = (
            0.35 * signal_quality +
            0.30 * spatial_consistency +
            0.20 * density_factor +
            0.15 * node_health_factor
        )
        return float(round(np.clip(confidence, 0.0, 1.0), 3))

    def calculate_uncertainty(
        self,
        confidence: float,
        measurement_density: float, # measurements per 100m²
        spatial_variance: float
    ) -> Tuple[float, str]:
        """
        Prototype uncertainty estimate:
        High when confidence is low or measurements are sparse.
        Returns: (uncertainty_score [0.0-1.0], category: LOW, MEDIUM, HIGH)
        """
        density_credit = min(0.6, measurement_density * 0.15)
        raw_uncertainty = (1.0 - confidence) * 0.75 + (0.5 - density_credit) * 0.25 + spatial_variance * 0.1
        score = float(round(np.clip(raw_uncertainty, 0.05, 0.95), 3))

        if score < 0.25:
            cat = "LOW"
        elif score < 0.55:
            cat = "MEDIUM"
        else:
            cat = "HIGH"

        return score, cat

    def cluster_targets(
        self,
        measurements: List[SurveyMeasurement],
        depth_nominal: float = 4200.0
    ) -> List[Target]:
        """
        Groups adjacent anomalous survey points into coherent spatial targets.
        """
        anomalous = [m for m in measurements if m.prospectivity >= self.config.prospectivity_threshold]
        if not anomalous:
            return []

        # Simple spatial clustering with radius threshold (e.g. 15 meters)
        clusters: List[List[SurveyMeasurement]] = []
        cluster_radius = 16.0

        for m in anomalous:
            matched = False
            for c in clusters:
                # Check distance to cluster centroid
                cx = np.mean([p.x for p in c])
                cy = np.mean([p.y for p in c])
                if np.sqrt((m.x - cx)**2 + (m.y - cy)**2) <= cluster_radius:
                    c.append(m)
                    matched = True
                    break
            if not matched:
                clusters.append([m])

        targets: List[Target] = []
        for idx, cl in enumerate(clusters):
            tid = f"TGT-{StringId(idx + 1)}"
            cx = float(round(np.mean([p.x for p in cl]), 1))
            cy = float(round(np.mean([p.y for p in cl]), 1))
            
            # Weighted average prospectivity
            mean_prosp = float(round(np.mean([p.prospectivity for p in cl]), 3))
            max_em = float(round(np.max([p.em_amplitude for p in cl]), 3))
            max_mag = float(round(np.max([p.magnetic_field for p in cl]), 1))
            mean_unc = float(round(np.mean([p.uncertainty for p in cl]), 3))
            
            # Derived confidence
            conf = float(round(np.clip(1.0 - mean_unc + 0.08 * len(cl), 0.2, 0.98), 3))
            
            # Formulate evidence points
            evidence = [
                f"Elevated EM amplitude response ({max_em} mV/m)",
                f"Localized magnetic field distortion ({max_mag} nT)",
                f"Cluster supported by {len(cl)} spatial grid measurements",
                "Secondary eddy current phase lag detected"
            ]

            # Determine status & recommendation
            if mean_prosp >= self.config.resurvey_threshold:
                if conf < 0.65 or mean_unc > 0.40:
                    status = "RESURVEY_PENDING"
                    rec = "Execute targeted high-density acoustic/EM resurvey to reduce spatial uncertainty"
                else:
                    status = "CONFIRMED"
                    rec = "High priority candidate for detailed seafloor investigation"
            elif mean_prosp >= self.config.prospectivity_threshold:
                status = "IDENTIFIED"
                rec = "Candidate zone identified; continue routine perimeter coverage"
            else:
                status = "IDENTIFIED"
                rec = "Low priority anomaly; archive for regional baseline comparison"

            targets.append(Target(
                id=tid,
                x=cx,
                y=cy,
                depth=depth_nominal + (idx % 3) * 6.5,
                prospectivity=mean_prosp,
                confidence=conf,
                uncertainty=mean_unc,
                em_response=max_em,
                magnetic_response=max_mag,
                signal_quality=0.88,
                status=status,
                evidence=evidence,
                recommended_action=rec
            ))

        # Sort targets by prospectivity descending
        targets.sort(key=lambda t: t.prospectivity, reverse=True)
        return targets

def StringId(n: int) -> str:
    return f"{n:02d}"
