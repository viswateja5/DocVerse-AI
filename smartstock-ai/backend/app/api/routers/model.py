from fastapi import APIRouter, BackgroundTasks, Request, Depends
from fastapi_cache.decorator import cache
import pandas as pd
from app.core.config import settings
from app.api.deps import RequireRole

router = APIRouter(
    prefix="/api",
    tags=["Model Management"]
)

def _run_training_pipeline():
    # Placeholder for the actual ModelTrainer logic 
    # to avoid blocking here. Usually imported from ml.training_pipeline
    import time
    time.sleep(5)
    print("Background training completed.")

@router.post("/train", status_code=202)
async def train_model(
    background_tasks: BackgroundTasks,
    current_user = Depends(RequireRole(["admin", "manager"]))
):
    """
    Triggers the Machine Learning pipeline in the background.
    """
    background_tasks.add_task(_run_training_pipeline)
    return {"message": "Training pipeline initiated in the background."}

@router.get("/model_metrics")
@cache(expire=3600)
async def get_model_metrics(request: Request):
    """
    Returns evaluation metrics from the latest training run.
    Cached for 1 hour.
    """
    # Mocking fetching metrics from DB or CSV
    return {
        "model_name": "CatBoost",
        "metrics": {
            "mae": 3.14,
            "rmse": 4.15,
            "mape": 14.1,
            "wape": 13.8,
            "r2": 0.57
        },
        "last_trained": "2026-07-27T09:00:00Z"
    }
