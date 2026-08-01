import math
import scipy.stats as stats

class InventoryEngine:
    
    @staticmethod
    def calculate_safety_stock(lead_time_mean: int, lead_time_std: float, demand_mean: float, demand_std: float, service_level: float = 0.95) -> int:
        """Calculates safety stock considering both demand and lead time variability."""
        z_score = stats.norm.ppf(service_level)
        variance_term = (lead_time_mean * (demand_std ** 2)) + ((demand_mean ** 2) * (lead_time_std ** 2))
        safety_stock = z_score * math.sqrt(variance_term)
        return int(math.ceil(safety_stock))

    @staticmethod
    def calculate_eoq(demand_annual: float, order_cost: float, holding_cost_per_unit: float) -> int:
        """Calculates Economic Order Quantity."""
        if holding_cost_per_unit <= 0:
            return 0
        eoq = math.sqrt((2 * demand_annual * order_cost) / holding_cost_per_unit)
        return int(math.ceil(eoq))

    @staticmethod
    def calculate_reorder_point(lead_time_demand: float, safety_stock: int) -> int:
        """Calculates Reorder Point."""
        return int(math.ceil(lead_time_demand + safety_stock))

    @staticmethod
    def calculate_stockout_probability(current_inventory: int, demand_mean: float, demand_std: float) -> float:
        """Calculates the probability of stocking out before the next replenishment."""
        if demand_std == 0:
            return 1.0 if current_inventory < demand_mean else 0.0
        
        # P(Demand > Current Inventory) = 1 - CDF(Current Inventory)
        prob = 1 - stats.norm.cdf(current_inventory, loc=demand_mean, scale=demand_std)
        return round(max(0.0, float(prob)), 4)

    @staticmethod
    def calculate_days_until_stockout(current_inventory: int, daily_demand_mean: float) -> float:
        """Estimates days until inventory reaches zero."""
        if daily_demand_mean <= 0:
            return float('inf')
        return round(current_inventory / daily_demand_mean, 1)
