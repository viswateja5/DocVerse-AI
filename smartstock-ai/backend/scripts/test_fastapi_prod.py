import os
import sys

# Add backend directory to sys path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def run_tests():
    with TestClient(app) as client:
        print("Testing /health (Rate Limiting)")
        for i in range(7):
            response = client.get("/health")
            if response.status_code == 429:
                print(f"Request {i+1}: Rate limited! (429)")
            else:
                print(f"Request {i+1}: {response.status_code}")
                
        print("\nTesting /api/model_metrics (Caching)")
        response1 = client.get("/api/model_metrics")
        print(f"First request status: {response1.status_code}")
        
        response2 = client.get("/api/model_metrics")
        print(f"Second request status: {response2.status_code}")
        
        print("\nTesting /api/dashboard")
        res = client.get("/api/dashboard")
        print(f"/dashboard status: {res.status_code}")
        
        print("\nTesting /api/recommend (Inventory Optimization)")
        payload = {
            "current_inventory": 150,
            "forecast_demand_mean": 25.5,
            "forecast_demand_std": 5.2,
            "supplier_lead_time_mean": 7,
            "supplier_lead_time_std": 1.5
        }
        res = client.post("/api/recommend", json=payload)
        print(f"/recommend status: {res.status_code}")
        if res.status_code == 200:
            print("Success! Response contains recommendation.")

        print("\nTesting /api/train (Background Tasks)")
        res = client.post("/api/train")
        print(f"/train status: {res.status_code} - {res.json()}")

if __name__ == "__main__":
    run_tests()
