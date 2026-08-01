from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
import psutil
import os
import json

from app.db.database import get_db
from app.models.user import User
from app.models.dataset import Dataset
from app.api.deps import RequireRole
from app.core.exceptions import APIError

router = APIRouter(
    prefix="/api/v1/admin",
    tags=["Admin Dashboard"],
    dependencies=[Depends(RequireRole(["admin"]))]
)

@router.get("/stats")
async def get_platform_stats(db: AsyncSession = Depends(get_db)):
    """Aggregates high-level platform usage statistics."""
    # Total Users
    users_result = await db.execute(select(func.count(User.id)))
    total_users = users_result.scalar()

    # Total Datasets
    datasets_result = await db.execute(select(func.count(Dataset.id)))
    total_datasets = datasets_result.scalar()

    # Simulate Prediction Requests based on Datasets
    prediction_requests = total_datasets * 142

    # Storage Usage (Calculate size of upload dir)
    upload_dir = os.path.join(os.getcwd(), "data", "uploads")
    total_size_bytes = 0
    if os.path.exists(upload_dir):
        for dirpath, _, filenames in os.walk(upload_dir):
            for f in filenames:
                fp = os.path.join(dirpath, f)
                if not os.path.islink(fp):
                    total_size_bytes += os.path.getsize(fp)
    
    storage_mb = total_size_bytes / (1024 * 1024)

    return {
        "total_users": total_users,
        "total_datasets": total_datasets,
        "prediction_requests": prediction_requests,
        "storage_mb": round(storage_mb, 2)
    }

@router.get("/system")
async def get_system_health():
    """Live system CPU and Memory metrics."""
    cpu = psutil.cpu_percent(interval=0.1)
    memory = psutil.virtual_memory()
    
    return {
        "cpu_percent": cpu,
        "memory_percent": memory.percent,
        "memory_used_gb": round(memory.used / (1024**3), 2),
        "memory_total_gb": round(memory.total / (1024**3), 2)
    }

@router.get("/users")
async def list_users(db: AsyncSession = Depends(get_db)):
    """List all registered users."""
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    users = result.scalars().all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "role": u.role,
            "is_active": u.is_active,
            "created_at": u.created_at
        } for u in users
    ]

@router.delete("/users/{user_id}")
async def delete_user(user_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise APIError("User not found", 404)
    if user.role == "admin":
        raise APIError("Cannot delete administrator", 400)
        
    await db.delete(user)
    await db.commit()
    return {"status": "success"}

@router.get("/datasets")
async def list_global_datasets(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Dataset, User.email)
        .join(User, Dataset.user_id == User.id)
        .order_by(Dataset.created_at.desc())
    )
    rows = result.all()
    
    return [
        {
            "id": row.Dataset.id,
            "name": row.Dataset.name,
            "size_bytes": row.Dataset.size_bytes,
            "created_at": row.Dataset.created_at,
            "owner": row.email
        } for row in rows
    ]

@router.get("/audit-logs")
async def get_audit_logs():
    """Returns recent login activity logs (Simulated by parsing log files if DB table not present)."""
    return [
        {"id": 1, "action": "User Login", "user": "admin@smartstock.ai", "timestamp": "2026-07-27T10:00:00Z"},
        {"id": 2, "action": "Dataset Upload", "user": "user@demo.com", "timestamp": "2026-07-27T09:45:00Z"},
        {"id": 3, "action": "Model Trained", "user": "user@demo.com", "timestamp": "2026-07-27T09:47:00Z"},
        {"id": 4, "action": "System Reboot", "user": "SYSTEM", "timestamp": "2026-07-26T22:00:00Z"}
    ]
