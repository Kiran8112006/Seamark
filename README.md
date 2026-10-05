# SEAMARK

Deployable seafloor metal detection sensor system and exploration reconnaissance platform developed for Smart India Hackathon (SIH 2026) Problem Statement 26064.

## Overview

SEAMARK is a prototype software and sensing demonstration for ocean resource exploration. The project models an array of deployable seafloor sensor nodes equipped with multi-frequency electromagnetic (EM) transmitter/receiver coils and 3-axis magnetometers. The system simulates sensor motion across a seafloor grid, processes synthetic acoustic and electromagnetic telemetry, detects localized conductivity and magnetic anomalies, estimates spatial prospectivity and uncertainty, and executes adaptive high-density resurveys over prioritized targets.

## Problem

Seafloor mineral exploration (such as surveying seafloor massive sulfides and polymetallic nodule fields at abyssal depths of 4,000 to 5,000 meters) presents significant technical difficulties:

1. **Acoustic and optical limits**: Optical cameras have limited range in turbid abyssal waters, while acoustic bathymetry cannot directly measure electrical conductivity or subsurface mineralization.
2. **High operational cost**: Deploying full-scale Remotely Operated Vehicles (ROVs) and surface research vessels for brute-force visual reconnaissance over vast areas is cost-prohibitive.
3. **Sparse and noisy data**: Seafloor EM signals suffer from conductive seawater attenuation, ambient electromagnetic noise, and weak secondary eddy current responses from buried conductive bodies.
4. **Data link constraints**: Acoustic telemetry between seafloor nodes and surface stations provides low bandwidth and is subject to packet loss, sequence gaps, and potential link tampering.

SEAMARK addresses these challenges through a low-cost deployable node array architecture combining synchronous quadrature demodulation, reference-node background subtraction, spatial neighborhood consistency analysis, and targeted adaptive follow-up.

## Approach

The processing pipeline follows nine discrete stages:

1. **Sensor Array Deployment**: A reference node is placed in a neutral background zone while survey nodes traverse a pre-planned boustrophedon (lawnmower) grid.
2. **Telemetry Acquisition**: Sensor nodes sample tri-axial magnetic flux, multi-frequency EM amplitudes, phase offsets, orientation, depth, and acoustic packet metadata.
3. **Signal Processing**: Raw carrier waveforms pass through bandpass filtering and synchronous quadrature ($I/Q$) demodulation to extract in-phase and quadrature amplitudes.
4. **Background Correction**: Measurements from the stationary reference node are subtracted from survey node readings ($\mathbf{Z}_{\text{corrected}} = \mathbf{Z}_{\text{survey}} - \mathbf{Z}_{\text{ref}}$) to remove ambient conductive seawater drift.
5. **Multi-Physics Anomaly Detection**: A composite anomaly score ($0.0$ to $1.0$) is calculated from normalized EM amplitude excess, secondary phase lag, and magnetic anomalies.
6. **Spatial Consistency Analysis**: Neighborhood coherence is computed around each measurement. Isolated readings receive lower confidence than anomalies confirmed by adjacent survey tracks.
7. **Prospectivity & Uncertainty Scoring**: Prospectivity ($0$ to $100\%$) is categorized as `LOW`, `MEDIUM`, or `HIGH` (indicating priority for further investigation, not confirmed mineral deposits). A prototype uncertainty estimate evaluates measurement density, distance to nearest track, and signal quality.
8. **Target Clustering & Ranking**: Adjacent anomalous points are grouped into candidate target zones with centroid coordinates, estimated depth, and recommended actions.
9. **Adaptive Resurvey**: When a target zone requires confirmation, the system triggers a fine-grid resurvey ($2.0\text{ m}$ spacing), collecting dense measurements that demonstrably reduce spatial uncertainty and raise confidence.

## System Architecture

```text
               Research Vessel / Surface Base Station
                                 |
              [ Acoustic Telemetry Uplink / HMAC-SHA256 ]
                                 |
       +-------------------------+-------------------------+
       |                                                   |
[ Reference Node SN-00 ]                         [ Survey Nodes SN-01..03 ]
(Ambient Baseline & Drift)                       (Lawnmower Grid Trajectory)
       |                                                   |
       +-------------------------+-------------------------+
                                 |
                     FastAPI Simulation Engine
                     (Deterministic Seafloor State)
                                 |
           +---------------------+---------------------+
           |                     |                     |
     Signal Demodulation   Detection Engine     Security & Integrity
     (I/Q Extraction &     (Spatial Coherence,   (Replay Defense,
      Ref Subtraction)      Prospectivity, IDW)   Sequence Tracking)
                                 |
                         REST API Interface
                         (127.0.0.1:8000/api)
                                 |
                        Next.js Dashboard
                      (127.0.0.1:3000 / App Router)
```

## Repository Structure

```text
SEAMARK/
├── backend/                  # FastAPI simulation engine and API
│   ├── api/
│   │   └── router.py         # REST endpoint handlers and route aliases
│   ├── core/
│   │   ├── detection.py      # Multi-physics anomaly scoring and clustering
│   │   ├── mapping.py        # IDW spatial interpolation and grid building
│   │   ├── resurvey.py       # Adaptive high-density subgrid resurvey
│   │   ├── security.py       # HMAC authentication, replay detection, audit log
│   │   ├── signal_processing.py # I/Q demodulation and background subtraction
│   │   └── simulation.py     # Deterministic survey loop and state machine
│   ├── models/
│   │   └── schemas.py        # Pydantic data schemas
│   ├── config.py             # System configuration parameters
│   ├── main.py               # Application entrypoint and CORS setup
│   ├── requirements.txt      # Python dependencies
│   ├── .env.example          # Backend environment template
│   └── test_api.py           # Backend endpoint test suite
├── frontend/                 # Next.js 16 web application
│   ├── src/
│   │   ├── app/              # App Router pages (11 operational views)
│   │   │   ├── configuration/
│   │   │   ├── detection/
│   │   │   ├── map/
│   │   │   ├── nodes/
│   │   │   ├── resurvey/
│   │   │   ├── security/
│   │   │   ├── sensor/
│   │   │   ├── survey/
│   │   │   ├── targets/
│   │   │   ├── telemetry/
│   │   │   ├── validation/
│   │   │   └── page.tsx      # Mission Overview dashboard
│   │   ├── components/       # Header, Sidebar, DemoControls, 3D SensorViewer
│   │   ├── services/
│   │   │   ├── api.ts        # Typed client connecting to FastAPI backend
│   │   │   └── mockData.ts   # Emergency offline fallback data
│   │   ├── store/
│   │   │   └── index.tsx     # Unified state store polling backend
│   │   └── types/
│   │       └── index.ts      # TypeScript interfaces
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example          # Frontend environment template
├── test_live_lifecycle.py    # Live server lifecycle verification script
├── test_e2e_integration.py   # End-to-end integration test script
├── .gitignore                # Root Git ignore rules
├── LICENSE                   # MIT License
└── README.md
```

## Technology Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **3D Visualization**: Three.js, React Three Fiber, React Three Drei
- **Icons**: Lucide React

### Backend
- **Framework**: FastAPI
- **Server**: Uvicorn
- **Validation**: Pydantic v2
- **Scientific Computing**: NumPy, SciPy (Butterworth digital filtering)
- **Data Handling**: Pandas

## Features

- **Mission Overview Dashboard**: Live KPI strip, 7-stage pipeline progress indicator (`SURVEY` → `ACQUIRE` → `PROCESS` → `DETECT` → `MAP` → `RANK` → `RESURVEY`), real-time telemetry preview, top ranked targets, and node health summary.
- **Survey Operations**: Visual boustrophedon track display, measurement logging, progress monitoring, and direct CSV export.
- **Multi-Channel Telemetry**: Time-series charts for EM amplitude, phase shift, tri-axial magnetic flux, temperature, battery, and acoustic signal-to-noise ratio.
- **Node Array Monitoring**: 4-node seafloor network tracker (1 Reference + 3 Survey) with coordinates, battery depletion curve, temperature, and acoustic link status.
- **Detection & Signal Processing**: Raw vs. bandpass-filtered waveform graphs, multi-frequency spectral response curves (500 Hz to 5,000 Hz), and anomaly threshold comparisons.
- **Target Ranking**: Prioritized table of detected zones ranked by prospectivity score, uncertainty, and evidence points.
- **2D Seafloor Heatmap**: Interactive 20×16 grid supporting layer toggles (Coverage, EM Anomaly, Magnetic Field, Prospectivity, Uncertainty, and Target Overlays) with Inverse Distance Weighting interpolation.
- **Adaptive Resurvey**: Interactive workflow that executes a 25-point fine grid ($2\text{ m}$ spacing) around selected targets, demonstrating measurable uncertainty reduction.
- **3D Hardware Inspection**: Interactive WebGL model of the sensor housing, titanium pressure vessel, transmitter/receiver coils, fluxgate magnetometer, and acoustic transponder with Assembly, Exploded, and Cutaway view modes.
- **Cybersecurity Console**: Real-time monitor for HMAC-SHA256 packet authentication, sequence rollback (replay) detection, sequence gap monitoring, and an interactive attack injection panel.
- **Data Export**: RFC 4180 compliant CSV export (`/api/export/csv`) and structured JSON export (`/api/export/json`).
- **Validation Criteria**: Automated assessment against sensing, mapping, detection, resurvey, and system benchmark thresholds.

## Running the Project

### Prerequisites
- Python 3.10+ (tested on Python 3.14)
- Node.js 18+ and npm

### 1. Backend Setup

Open a terminal and navigate to the `backend` folder:

```powershell
cd backend
python -m pip install -r requirements.txt
```

Create local environment configuration:

```powershell
Copy-Item .env.example .env
```

Start the FastAPI backend server:

```powershell
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

The API will be available at `http://127.0.0.1:8000`. Swagger documentation is accessible at `http://127.0.0.1:8000/docs`.

### 2. Frontend Setup

Open a second terminal and navigate to the `frontend` folder:

```powershell
cd frontend
npm install
```

Create local environment configuration:

```powershell
Copy-Item .env.example .env.local
```

Start the Next.js development server:

```powershell
npm run dev
```

The frontend will be available at `http://localhost:3000`.

## Environment Variables

### Frontend (`frontend/.env.example`)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_USE_MOCK=false
```

- `NEXT_PUBLIC_API_URL`: Points to the running FastAPI backend router.
- `NEXT_PUBLIC_USE_MOCK`: Set to `false` for normal backend-connected operation. Set to `true` only for offline demonstration without a running backend.

### Backend (`backend/.env.example`)
```env
SEAMARK_HOST=127.0.0.1
SEAMARK_PORT=8000
SEAMARK_HMAC_SECRET=replace_with_a_secure_random_secret
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

- `SEAMARK_HOST`: Host interface binding.
- `SEAMARK_PORT`: Port binding.
- `SEAMARK_HMAC_SECRET`: Master key used to derive per-node HMAC authentication keys.
- `CORS_ORIGINS`: Comma-separated list of allowed origins.

## Backend API

Base URL: `http://127.0.0.1:8000/api`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/system/status` | System operational state, node counts, uptime |
| `GET` | `/survey/current` | Current trajectory position, progress percentage, step index |
| `POST` | `/survey/start` | Starts or resumes autonomous survey loop |
| `POST` | `/survey/pause` | Pauses active survey loop |
| `POST` | `/survey/reset` | Resets survey state to Step 0 and clears stale data |
| `POST` | `/survey/speed` | Sets survey simulation speed multiplier (`0.5x` to `10.0x`) |
| `GET` | `/survey/measurements` | Table of acquired survey measurements |
| `GET` | `/telemetry` | Recent multi-channel sensor telemetry readings |
| `GET` | `/nodes` | Array status for Reference and Survey nodes |
| `GET` | `/detection/latest` | Waveforms and multi-frequency response spectra |
| `GET` | `/detection/status` | Anomaly count, target count, highest prospectivity |
| `GET` | `/targets` | Ranked candidate target list |
| `GET` | `/targets/{id}` | Detailed assessment for a specific target |
| `GET` | `/map` | Grid cell values for seafloor spatial map (320 cells) |
| `GET` | `/resurvey/state` | Status of adaptive resurvey follow-up |
| `POST` | `/resurvey/start` | Executes high-density resurvey on target |
| `GET` | `/validation` | Benchmark performance criteria |
| `GET` | `/security/status` | Cryptographic packet counters and integrity state |
| `GET` | `/security/events` | Audit log of security and packet integrity events |
| `POST` | `/security/simulate-event` | Injects simulated acoustic attack for demonstration |
| `GET` | `/export/csv` | RFC 4180 CSV export of survey measurements |
| `GET` | `/export/json` | Structured JSON export of entire mission state |

## Demonstration Workflow

To conduct a clean demonstration:

1. **Initial State**: Navigate to `http://localhost:3000`. The header displays `BACKEND ENGINE: FASTAPI LIVE` and `DATA SOURCE: FASTAPI BACKEND (SIMULATION)`. Click **Reset** in the top bar to verify the system starts at **Step 0** with zero measurements, no stale targets, and an empty survey map.
2. **Start Survey**: Click **Start** in the demo controls. The boustrophedon survey track begins advancing, populating telemetry curves and measurements in real time.
3. **Observation**: Check the **Telemetry** and **Detection** tabs to view demodulated EM waveforms and multi-frequency response curves.
4. **Target Appearance**: As the survey passes coordinates $(35\text{ m}, 25\text{ m})$, multi-physics anomaly scoring triggers target clustering. Candidate `TGT-01` appears in the **Targets** list with prospectivity $> 0.50$.
5. **Adaptive Resurvey**: Navigate to the **Resurvey** tab, select `TGT-01`, and click **Execute Adaptive Resurvey**. The backend runs 25 high-density subgrid measurements at 2 m spacing. The before-and-after comparison displays an uncertainty drop (e.g., from 0.28 to 0.06) and elevated confidence.
6. **Cybersecurity Defense**: Open the **Integrity & Security** tab. Click **Inject Acoustic Replay Attack** or **Inject Rogue Node Transmission** to observe the backend rejecting the transmission and logging the event in the audit stream.
7. **Export**: On the **Survey** tab, click **Export CSV** to download the complete measurement log.

## Cybersecurity

The prototype includes an acoustic packet integrity layer:

- **HMAC-SHA256 Authentication**: Each telemetry packet is signed using keys derived per node from `SEAMARK_HMAC_SECRET`.
- **Node Authorization**: Only registered node IDs (`SN-00` through `SN-03`) are accepted; transmissions from unrecognized identifiers are rejected and logged.
- **Sequence Gap Detection**: Tracks incremental packet sequences to detect and flag acoustic loss caused by thermoclines or packet drops.
- **Replay Protection**: Monitors sequence rollback and duplicate payload hashes to reject re-transmitted packets.
- **Interactive Anomaly Injection**: Test endpoints allow simulating replay attempts, sequence gaps, and rogue transmissions for demonstration purposes.

*Note: This implementation is an architectural simulation for protocol demonstration, not a production-certified cryptographic security appliance.*

## Testing

The test suite covers endpoints, concurrency, and end-to-end integration:

1. **Backend Unit & Endpoint Test Suite** (`backend/test_api.py`):
   Tests all 14 API endpoints, data models, state machine transitions, and exports using FastAPI's test client.
   ```powershell
   python backend/test_api.py
   ```
2. **Live Lifecycle Verification** (`test_live_lifecycle.py`):
   Tests the full lifecycle against the running backend daemon:
   $\text{RESET} \to \text{START} \to \text{PROGRESS} \to \text{TARGET DETECTED} \to \text{RESURVEY} \to \text{RESET} \to \text{START AGAIN}$.
   ```powershell
   python test_live_lifecycle.py
   ```
3. **End-to-End System Test** (`test_e2e_integration.py`):
   Queries both the running FastAPI backend (`:8000`) and Next.js frontend (`:3000`), verifying all 11 frontend pages return HTTP 200 and data models stay synchronized.
   ```powershell
   python test_e2e_integration.py
   ```
4. **Frontend Production Build**:
   Compiles all routes and verifies strict TypeScript type checking without errors.
   ```powershell
   cd frontend
   npm run build
   ```

## Simulation and Data Disclaimer

The current prototype uses deterministic simulated sensor data for software demonstration and validation. The generated values are not measured deep-ocean field data and do not constitute laboratory mineral assay results.

Technical limitations of the current prototype include:
- **In-memory state**: The simulation state is held in application memory for hackathon presentation simplicity rather than in a persistent database.
- **Interpolation model**: Spatial mapping utilizes 2D Inverse Distance Weighting (IDW) bounded to a 2.5× grid spacing support radius rather than full 3D geophysical inversion.
- **Acoustic channel model**: Acoustic communication attenuation and multipath effects are modeled through stochastic drop and noise parameters rather than ray-tracing ocean acoustic simulations.
- **Mechanical validation**: Physical sensor housings and titanium pressure vessel models are design concepts and have not undergone hydrostatic pressure vessel chamber testing.

## Limitations and Future Work

- Integration with physical AUV/glider hardware via serial/NMEA interfaces.
- Replacement of in-memory state with a persistent time-series database (e.g., TimescaleDB).
- Full 3D finite-element electromagnetic forward modeling and inversion.
- Field testing of physical inductive coil receiver circuitry in saltwater test tanks.

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
