# ============================================================
# SEAMARK — Signal Processing & Synchronous Demodulation Engine
# Prototype EM Demodulation, Reference Subtraction, and Filtering
# ============================================================
import numpy as np
from scipy import signal
from typing import Dict, Any, List, Tuple

class SignalProcessor:
    def __init__(self, sample_rate: float = 20000.0, num_samples: int = 128):
        self.sample_rate = sample_rate
        self.num_samples = num_samples
        self.time_vector = np.linspace(0, num_samples / sample_rate, num_samples, endpoint=False)

    def generate_raw_signal(
        self,
        freq: float,
        amplitude: float,
        phase_deg: float,
        snr_db: float = 22.0,
        seed: int = 42
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Synthesizes a realistic ocean EM carrier waveform with additive noise and returns (raw, filtered).
        """
        rng = np.random.RandomState(seed % (2**31 - 1))
        phase_rad = np.radians(phase_deg)
        pure_carrier = amplitude * np.cos(2.0 * np.pi * freq * self.time_vector + phase_rad)

        # Add subtle harmonic distortion (conductive ocean medium response)
        pure_carrier += 0.08 * amplitude * np.cos(4.0 * np.pi * freq * self.time_vector + 2 * phase_rad)

        # Ambient ocean EM noise (pink / band-limited Gaussian)
        sig_power = np.mean(pure_carrier**2)
        noise_power = sig_power / (10.0 ** (snr_db / 10.0)) if sig_power > 0 else 0.001
        noise = rng.normal(0, np.sqrt(noise_power), self.num_samples)

        raw_signal = pure_carrier + noise

        # Digital bandpass filter around target frequency
        nyquist = self.sample_rate / 2.0
        low_cut = max(50.0, freq * 0.7) / nyquist
        high_cut = min(nyquist - 100.0, freq * 1.3) / nyquist
        
        try:
            b, a = signal.butter(3, [low_cut, high_cut], btype='bandpass')
            filtered_signal = signal.filtfilt(b, a, raw_signal)
        except Exception:
            # Fallback if filter design exceeds bounds
            filtered_signal = raw_signal

        return raw_signal, filtered_signal

    def synchronous_demodulation(self, sig: np.ndarray, freq: float) -> Tuple[float, float]:
        """
        Quadrature In-Phase (I) and Quadrature (Q) synchronous demodulation.
        Returns: (amplitude, phase_degrees)
        """
        ref_cos = np.cos(2.0 * np.pi * freq * self.time_vector)
        ref_sin = np.sin(2.0 * np.pi * freq * self.time_vector)

        # Coherent integration
        i_comp = (2.0 / len(sig)) * np.sum(sig * ref_cos)
        q_comp = (2.0 / len(sig)) * np.sum(sig * ref_sin)

        amplitude = float(np.sqrt(i_comp**2 + q_comp**2))
        phase_rad = float(np.arctan2(q_comp, i_comp))
        phase_deg = float(np.degrees(phase_rad))

        return amplitude, phase_deg

    def compute_multi_frequency_response(
        self,
        base_amplitude: float,
        target_proximity: float, # 0.0 (far) to 1.0 (directly over target)
        frequencies: List[float] = [500.0, 1250.0, 2500.0, 5000.0]
    ) -> List[float]:
        """
        Computes the frequency response vector based on inductive eddy-current response function:
        Response R(omega) = omega*tau / sqrt(1 + (omega*tau)^2)
        """
        tau = 0.00035 # Conductive response relaxation time constant
        responses = []
        for f in frequencies:
            omega = 2.0 * np.pi * f
            inductive_factor = (omega * tau) / np.sqrt(1.0 + (omega * tau)**2)
            # Response amplitude combines background and induced eddy response
            resp = base_amplitude * (0.8 + 0.4 * inductive_factor * target_proximity)
            responses.append(round(float(resp), 4))
        return responses

    def background_correction(
        self,
        survey_amp: float,
        survey_phase_deg: float,
        survey_mag: float,
        ref_amp: float,
        ref_phase_deg: float,
        ref_mag: float
    ) -> Dict[str, float]:
        """
        Reference-node background correction:
        Calculates complex difference between survey node and reference baseline.
        """
        z_survey = survey_amp * np.exp(1j * np.radians(survey_phase_deg))
        z_ref = ref_amp * np.exp(1j * np.radians(ref_phase_deg))
        z_corrected = z_survey - z_ref

        corrected_amplitude = float(np.abs(z_corrected))
        corrected_phase_deg = float(np.degrees(np.angle(z_corrected)))
        mag_anomaly = float(survey_mag - ref_mag)

        return {
            "corrected_amplitude": max(0.0, corrected_amplitude),
            "corrected_phase": corrected_phase_deg,
            "magnetic_anomaly": mag_anomaly,
            "raw_amplitude": survey_amp,
            "raw_phase": survey_phase_deg
        }

signal_processor = SignalProcessor()
