from fastapi import APIRouter, Request
from app.core.exceptions import APIError
from fastapi_cache.decorator import cache
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.schemas.inventory import InventoryOptimizationRequest, InventoryOptimizationResponse
from app.services.optimization_service import OptimizationService

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(
    prefix="/api",
    tags=["Dashboard & Recommendations"]
)

@router.get("/dashboard")
@cache(expire=300) # Cache for 5 minutes
async def get_dashboard_summary(request: Request):
    """
    Aggregates high-level metrics for the frontend UI.
    """
    return {
        "total_active_skus": 1204,
        "high_risk_skus": 45,
        "total_inventory_value": 540200.0,
        "recent_alerts": [
            {"product_id": "P001", "store_id": "S001", "message": "Stockout likely in 5 days"},
            {"product_id": "P042", "store_id": "S003", "message": "Supplier delay expected"}
        ]
    }

@router.post("/recommend", response_model=InventoryOptimizationResponse)
@limiter.limit("100/minute")
async def get_inventory_recommendation(request: Request, payload: InventoryOptimizationRequest):
    """
    Wraps the Inventory Optimization Engine to return actionable insights.
    """
    try:
        response = OptimizationService.optimize(payload)
        return response
    except Exception as e:
        raise APIError(str(e), status_code=500)
