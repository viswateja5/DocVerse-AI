from pydantic import BaseModel
from typing import Optional

class InventoryOptimizationRequest(BaseModel):
    current_inventory: int
    forecast_demand_mean: float
    forecast_demand_std: float
    supplier_lead_time_mean: int
    supplier_lead_time_std: float
    service_level: Optional[float] = 0.95
    holding_cost: Optional[float] = 0.20 # 20% of item cost per year
    order_cost: Optional[float] = 100.0 # Fixed cost per order
    item_cost: Optional[float] = 50.0

class InventoryOptimizationResponse(BaseModel):
    safety_stock: int
    economic_order_quantity: int
    reorder_point: int
    stockout_probability: float
    days_until_stockout: float
    supplier_delay_impact: str
    recommendation: dict
