import os
import sys

# Add backend directory to sys path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_inventory_api():
    print("Testing Inventory Optimization API...")
    payload = {
        "current_inventory": 150,
        "forecast_demand_mean": 25.5,
        "forecast_demand_std": 5.2,
        "supplier_lead_time_mean": 7,
        "supplier_lead_time_std": 1.5,
        "service_level": 0.95,
        "holding_cost": 0.20,
        "order_cost": 150.0,
        "item_cost": 45.0
    }
    
    response = client.post("/api/inventory/optimize", json=payload)
    print(f"Status Code: {response.status_code}")
    print("Response:")
    import json
    print(json.dumps(response.json(), indent=2))

def test_forecast_xai_api():
    print("\nTesting Forecast XAI API...")
    
    # Needs to match the features used in model training exactly
    # Let's provide a mock vector
    payload = {
        "features": {
            "Sales_Lag_1": 120.0,
            "Sales_Lag_7": 115.0,
            "Rolling_Mean_7": 118.5,
            "Is_Weekend": 1.0,
            "Holiday": 0.0,
            "Promotion": 1.0,
            "Price": 19.99
        },
        "model_name": "CatBoost"
    }
    
    response = client.post("/api/forecast/explain", json=payload)
    print(f"Status Code: {response.status_code}")
    print("Response:")
    import json
    # Truncate shap values in print for readability
    data = response.json()
    if "shap_values" in data:
        data["shap_values"] = {k: v for i, (k, v) in enumerate(data["shap_values"].items()) if i < 3}
        data["shap_values"]["..."] = "truncated"
    print(json.dumps(data, indent=2))

if __name__ == "__main__":
    test_inventory_api()
    test_forecast_xai_api()
