import asyncio
import httpx

API_URL = "http://localhost:8000"

async def test_auth():
    print("Testing Backend Authentication Flow...")
    
    async with httpx.AsyncClient(base_url=API_URL) as client:
        # 1. Register an Admin user
        print("\n--- Registering Admin User ---")
        reg_resp = await client.post("/api/v1/auth/register", json={
            "email": "admin@smartstock.ai",
            "password": "securepassword123",
            "role": "admin"
        })
        if reg_resp.status_code == 400:
            print("User already exists.")
        else:
            print("Registered:", reg_resp.json())

        # 2. Login
        print("\n--- Logging In ---")
        login_resp = await client.post("/api/v1/auth/login", data={
            "username": "admin@smartstock.ai",
            "password": "securepassword123"
        })
        assert login_resp.status_code == 200
        token_data = login_resp.json()
        print("Logged in. Access Token:", token_data["access_token"][:30] + "...")
        
        headers = {"Authorization": f"Bearer {token_data['access_token']}"}

        # 3. Check /me
        print("\n--- Checking /me endpoint ---")
        me_resp = await client.get("/api/v1/auth/me", headers=headers)
        print("Me Profile:", me_resp.json())

        # 4. Access Protected Route (Train Model)
        print("\n--- Accessing Protected Route (Admin Only) ---")
        train_resp = await client.post("/api/train", headers=headers)
        print("Train Response (Expected 202):", train_resp.status_code, train_resp.json())

        # 5. Register and test Viewer User
        print("\n--- Testing Role Enforcement (Viewer) ---")
        await client.post("/api/v1/auth/register", json={
            "email": "viewer@smartstock.ai",
            "password": "viewerpassword",
            "role": "viewer"
        })
        viewer_login = await client.post("/api/v1/auth/login", data={
            "username": "viewer@smartstock.ai",
            "password": "viewerpassword"
        })
        viewer_token = viewer_login.json()["access_token"]
        viewer_headers = {"Authorization": f"Bearer {viewer_token}"}
        
        viewer_train = await client.post("/api/train", headers=viewer_headers)
        print("Viewer Train Response (Expected 403 Forbidden):", viewer_train.status_code, viewer_train.json())

if __name__ == "__main__":
    asyncio.run(test_auth())
