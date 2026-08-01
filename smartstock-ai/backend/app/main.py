from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend

from app.core.config import settings
from app.core.logging import setup_logging
import sentry_sdk
from prometheus_fastapi_instrumentator import Instrumentator
from app.core.exceptions import (
    APIError, 
    api_error_handler, 
    validation_exception_handler, 
    global_exception_handler
)
from app.api.routers import model, predict, dashboard, auth, datasets, admin
from app.db.database import engine, Base
from app.models.dataset import Dataset

# Initialize Structured Logging
setup_logging()

# Initialize Sentry for Error Tracking
if getattr(settings, "SENTRY_DSN", None):
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        traces_sample_rate=1.0,
        environment=settings.ENVIRONMENT,
    )

# Setup Rate Limiter
limiter = Limiter(key_func=get_remote_address)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize Cache (Falling back to InMemory for demonstration without docker)
    # For production with Redis:
    # import redis.asyncio as redis
    # from fastapi_cache.backends.redis import RedisBackend
    # redis_cache = redis.from_url(settings.REDIS_URL)
    # FastAPICache.init(RedisBackend(redis_cache), prefix="smartstock-cache")
    
    FastAPICache.init(InMemoryBackend(), prefix="smartstock-cache")
    
    # Initialize DB tables (for development/SQLite)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Preload ML models in background
    try:
        from app.api.routers.predict import get_xai_engine
        get_xai_engine()
    except Exception as e:
        print(f"Failed to preload model: {e}")
        
    yield
    # Cleanup on shutdown
    await engine.dispose()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Sales & Inventory Forecasting Platform - Production API",
    lifespan=lifespan
)

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception Handlers
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_exception_handler(APIError, api_error_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, global_exception_handler)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(datasets.router, prefix="/api/v1/datasets", tags=["Datasets"])
app.include_router(model.router)
app.include_router(predict.router)
app.include_router(dashboard.router)
app.include_router(admin.router, prefix="/api/v1/admin", tags=["Admin"])

# Initialize Prometheus Instrumentator
Instrumentator().instrument(app).expose(app)

# Provide limiter to the app state
app.state.limiter = limiter

from fastapi import Request

@app.get("/health", tags=["Health"])
@limiter.limit("5/minute")
async def health_check(request: Request):
    return {"status": "healthy", "environment": settings.ENVIRONMENT}
