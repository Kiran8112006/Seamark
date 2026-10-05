# SEAMARK Backend

FastAPI simulation, synchronous demodulation, anomaly detection, and adaptive resurvey engine for the SEAMARK ocean resource exploration platform.

## Getting Started

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Copy the environment configuration:
   ```bash
   cp .env.example .env
   ```

3. Run the development server:
   ```bash
   python -m uvicorn main:app --host 127.0.0.1 --port 8000
   ```

The API will be available at [http://127.0.0.1:8000](http://127.0.0.1:8000). Interactive Swagger documentation is accessible at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

## Running Tests

Run the endpoint test suite:
```bash
python test_api.py
```

For complete project documentation, system architecture, and frontend instructions, refer to the root [README.md](../README.md).
