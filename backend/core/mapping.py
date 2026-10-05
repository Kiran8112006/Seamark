# ============================================================
# SEAMARK — Spatial Mapping & Inverse Distance Weighting (IDW) Interpolation
# SIH 2026 Problem Statement: 26064
# ============================================================
import numpy as np
from typing import List, Dict, Optional
from config import SystemConfiguration
from models.schemas import MapCell, SurveyMeasurement, Target

class MappingEngine:
    def __init__(self, config: SystemConfiguration):
        self.config = config

    def build_grid_cells(
        self,
        measurements: List[SurveyMeasurement],
        targets: List[Target],
        support_radius_factor: float = 2.5
    ) -> List[MapCell]:
        """
        Builds the 2D seafloor spatial map grid.
        Applies Inverse Distance Weighting (IDW) ONLY within measurement support distance.
        Cells beyond measurement support return coverage='NO_DATA' with null values.
        """
        gx = self.config.survey_grid_size_x
        gy = self.config.survey_grid_size_y
        spacing = self.config.grid_spacing
        support_radius = spacing * support_radius_factor

        # Map fast lookup by integer cell coordinates
        direct_map: Dict[tuple, SurveyMeasurement] = {}
        for m in measurements:
            # Rounding to cell index
            ix = int(round(m.x / spacing))
            iy = int(round(m.y / spacing))
            direct_map[(ix, iy)] = m

        cells: List[MapCell] = []

        for cy in range(gy):
            for cx in range(gx):
                cell_real_x = cx * spacing
                cell_real_y = cy * spacing

                # Target vicinity check
                has_target = any(
                    np.sqrt((t.x - cell_real_x)**2 + (t.y - cell_real_y)**2) <= (spacing * 1.4)
                    for t in targets
                )

                if (cx, cy) in direct_map:
                    # Cell was directly surveyed
                    m = direct_map[(cx, cy)]
                    cells.append(MapCell(
                        x=cx,
                        y=cy,
                        coverage="MEASURED",
                        em_anomaly=round(m.em_amplitude, 3),
                        magnetic=round(m.magnetic_field, 1),
                        prospectivity=round(m.prospectivity, 3),
                        uncertainty=round(m.uncertainty, 3),
                        has_target=has_target,
                        measurement_count=1
                    ))
                else:
                    # Search for measured points within support radius
                    nearby = []
                    for m in measurements:
                        d = np.sqrt((m.x - cell_real_x)**2 + (m.y - cell_real_y)**2)
                        if d <= support_radius:
                            nearby.append((m, d))

                    if nearby:
                        # Inverse Distance Weighting (IDW with p=2)
                        weights = [1.0 / max(0.2, d**2) for _, d in nearby]
                        total_weight = sum(weights)

                        interp_em = sum(m.em_amplitude * w for (m, _), w in zip(nearby, weights)) / total_weight
                        interp_mag = sum(m.magnetic_field * w for (m, _), w in zip(nearby, weights)) / total_weight
                        interp_prosp = sum(m.prospectivity * w for (m, _), w in zip(nearby, weights)) / total_weight

                        # Uncertainty increases with distance to nearest survey point
                        min_dist = min(d for _, d in nearby)
                        dist_penalty = min(0.35, (min_dist / support_radius) * 0.35)
                        base_unc = sum(m.uncertainty * w for (m, _), w in zip(nearby, weights)) / total_weight
                        interp_unc = min(0.95, base_unc + dist_penalty)

                        cells.append(MapCell(
                            x=cx,
                            y=cy,
                            coverage="INTERPOLATED",
                            em_anomaly=round(float(interp_em), 3),
                            magnetic=round(float(interp_mag), 1),
                            prospectivity=round(float(interp_prosp), 3),
                            uncertainty=round(float(interp_unc), 3),
                            has_target=has_target,
                            measurement_count=len(nearby)
                        ))
                    else:
                        # Outside measurement support -> NO_DATA
                        cells.append(MapCell(
                            x=cx,
                            y=cy,
                            coverage="NO_DATA",
                            em_anomaly=None,
                            magnetic=None,
                            prospectivity=None,
                            uncertainty=None,
                            has_target=has_target,
                            measurement_count=0
                        ))

        return cells
