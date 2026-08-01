from app.schemas.inventory import InventoryOptimizationRequest, InventoryOptimizationResponse
from app.services.inventory_engine import InventoryEngine

class OptimizationService:
    
    @staticmethod
    def optimize(request: InventoryOptimizationRequest) -> InventoryOptimizationResponse:
        
        # Derived parameters
        annual_demand = request.forecast_demand_mean * 365
        holding_cost_per_unit = request.item_cost * request.holding_cost
        lead_time_demand = request.forecast_demand_mean * request.supplier_lead_time_mean
        
        # Engine Calculations
        safety_stock = InventoryEngine.calculate_safety_stock(
            request.supplier_lead_time_mean,
            request.supplier_lead_time_std,
            request.forecast_demand_mean,
            request.forecast_demand_std,
            request.service_level
        )
        
        eoq = InventoryEngine.calculate_eoq(
            annual_demand,
            request.order_cost,
            holding_cost_per_unit
        )
        
        reorder_point = InventoryEngine.calculate_reorder_point(lead_time_demand, safety_stock)
        
        # Risk Metrics
        stockout_prob = InventoryEngine.calculate_stockout_probability(
            request.current_inventory, 
            lead_time_demand, 
            request.forecast_demand_std * request.supplier_lead_time_mean # Simplified std over lead time
        )
        
        days_until_stockout = InventoryEngine.calculate_days_until_stockout(
            request.current_inventory, 
            request.forecast_demand_mean
        )
        
        # Delay Impact Evaluation
        delay_impact = "High" if request.supplier_lead_time_std > 2.0 else "Low"
        
        # Business Rules for Risk Level
        if stockout_prob > 0.30 or days_until_stockout < request.supplier_lead_time_mean:
            risk_level = "High"
        elif stockout_prob > 0.10:
            risk_level = "Medium"
        else:
            risk_level = "Low"
            
        # Compile Recommendation
        if request.current_inventory <= reorder_point:
            action = "Reorder Now"
            reorder_qty = eoq
        else:
            action = "Hold"
            reorder_qty = 0
            
        recommendation = {
            "status": action,
            "recommended_order_quantity": reorder_qty,
            "risk_level": risk_level,
            "expected_inventory_post_order": request.current_inventory + reorder_qty
        }
        
        return InventoryOptimizationResponse(
            safety_stock=safety_stock,
            economic_order_quantity=eoq,
            reorder_point=reorder_point,
            stockout_probability=stockout_prob,
            days_until_stockout=days_until_stockout,
            supplier_delay_impact=delay_impact,
            recommendation=recommendation
        )
