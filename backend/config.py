# ============================================================
# SEAMARK — Configuration & Simulation Parameters
# SIH 2026 Problem Statement: 26064
# ============================================================
from pydantic import BaseModel, Field
from typing import List

class SystemConfiguration(BaseModel):
    em_frequency: float = Field(default=2500.0, description="Primary EM Frequency in Hz", ge=100.0, le=20000.0)
    em_frequencies: List[float] = Field(default=[500.0, 1250.0, 2500.0, 5000.0], description="Supported multi-frequency EM band")
    survey_grid_size_x: int = Field(default=20, description="Survey grid width (cells)", ge=5, le=100)
    survey_grid_size_y: int = Field(default=16, description="Survey grid height (cells)", ge=5, le=100)
    grid_spacing: float = Field(default=5.0, description="Grid spacing in meters", ge=1.0, le=50.0)
    node_count: int = Field(default=4, description="Sensor node count (1 Reference + N Survey)", ge=2, le=16)
    anomaly_threshold: float = Field(default=0.6, description="Detection anomaly threshold", ge=0.0, le=1.0)
    prospectivity_threshold: float = Field(default=0.5, description="Target prospectivity threshold", ge=0.0, le=1.0)
    resurvey_threshold: float = Field(default=0.7, description="Adaptive resurvey trigger threshold", ge=0.0, le=1.0)
    simulation_speed: float = Field(default=1.0, description="Simulation speed multiplier", ge=0.1, le=10.0)
    simulation_seed: int = Field(default=42, description="Deterministic random seed")
    seafloor_depth: float = Field(default=4200.0, description="Nominal seafloor depth (meters)")
    magnetic_background: float = Field(default=48500.0, description="Earth geomagnetic background in nT")
    em_background_amplitude: float = Field(default=0.12, description="Background EM amplitude in mV/m")
    em_background_phase: float = Field(default=-15.0, description="Background EM phase in degrees")

DEFAULT_CONFIG = SystemConfiguration()
