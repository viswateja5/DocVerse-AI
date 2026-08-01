FROM python:3.11-slim as builder

WORKDIR /app

# Install build dependencies for ML packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt
RUN pip install --user --no-cache-dir gunicorn sentry-sdk prometheus-fastapi-instrumentator python-jose[cryptography] passlib[bcrypt] psycopg2-binary aiosqlite asyncpg email-validator

# Multi-stage build for smaller image size
FROM python:3.11-slim

WORKDIR /app

# Copy dependencies from builder
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH
ENV PYTHONPATH=/app

# Needed for lightgbm/xgboost and curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends libgomp1 curl && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

COPY . .

# Create directory for ML models to be stored
RUN mkdir -p /app/data/models

# Create non-root user for security
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8000/api/v1/health || exit 1

# Expose port
EXPOSE 8000

# Optimize startup time with Gunicorn + Uvicorn workers
CMD ["gunicorn", "app.main:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "-b", "0.0.0.0:8000", "--access-logfile", "-", "--error-logfile", "-"]
