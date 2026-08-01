from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, BackgroundTasks, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
import os
import uuid
import json
import numpy as np
import pandas as pd
from pydantic import BaseModel

from app.db.database import get_db
from app.models.user import User
from app.models.dataset import Dataset
from app.api.deps import get_current_user

router = APIRouter()

UPLOAD_DIR = os.path.join(os.getcwd(), "data", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

class DatasetRename(BaseModel):
    name: str

class ColumnSchemaDef(BaseModel):
    name: str
    role: str
    confidence: float
    type: str

class DatasetSchemaUpdate(BaseModel):
    columns: List[ColumnSchemaDef]

@router.post("/upload")
async def upload_dataset(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Validate extension
    ext = file.filename.split('.')[-1].lower()
    if ext not in ['csv', 'xlsx', 'parquet']:
        raise HTTPException(status_code=400, detail="Only CSV, Excel, and Parquet files are supported")
    
    # Store file securely
    file_id = str(uuid.uuid4())
    secure_filename = f"{file_id}.{ext}"
    storage_path = os.path.join(UPLOAD_DIR, secure_filename)
    
    size_bytes = 0
    with open(storage_path, "wb") as f:
        while chunk := await file.read(8192 * 1024):
            f.write(chunk)
            size_bytes += len(chunk)
    
    if size_bytes > 50 * 1024 * 1024:  # 50MB limit
        os.remove(storage_path)
        raise HTTPException(status_code=400, detail="File size exceeds 50MB limit")

    dataset = Dataset(
        user_id=current_user.id,
        name=file.filename,
        original_filename=file.filename,
        storage_path=secure_filename,
        file_type=ext,
        size_bytes=size_bytes,
        status="uploading"
    )
    db.add(dataset)
    await db.commit()
    await db.refresh(dataset)
    
    # Trigger background profiling without passing the request's db session
    background_tasks.add_task(profile_dataset, dataset.id, storage_path, ext)
    
    # Read first 100 rows for immediate preview
    preview_data = {}
    try:
        if ext == 'csv':
            df_preview = pd.read_csv(storage_path, nrows=100)
        elif ext == 'xlsx':
            df_preview = pd.read_excel(storage_path, nrows=100)
        elif ext == 'parquet':
            df_preview = pd.read_parquet(storage_path).head(100)
        preview_data = {
            "columns": df_preview.columns.tolist(),
            "data": df_preview.fillna("NaN").to_dict(orient="records")
        }
    except Exception as e:
        pass
    
    return {"message": "Upload started", "id": dataset.id, "preview": preview_data}

def _process_dataset_sync(file_path: str, ext: str) -> tuple:
    import pandas as pd
    import numpy as np
    import json
    
    if ext == 'csv':
        df = pd.read_csv(file_path)
    elif ext == 'xlsx':
        df = pd.read_excel(file_path)
    elif ext == 'parquet':
        df = pd.read_parquet(file_path)
        
    num_rows = len(df)
    num_cols = len(df.columns)
    duplicates = int(df.duplicated().sum())
    
    missing_counts = df.isnull().sum().to_dict()
    dtypes = df.dtypes.astype(str).to_dict()
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    
    target_suggestions = []
    outliers_count = {}
    
    for col in numeric_cols:
        Q1 = df[col].quantile(0.25)
        Q3 = df[col].quantile(0.75)
        IQR = Q3 - Q1
        outliers = ((df[col] < (Q1 - 1.5 * IQR)) | (df[col] > (Q3 + 1.5 * IQR))).sum()
        outliers_count[col] = int(outliers)
        
        if "id" not in col.lower() and df[col].nunique() > 10:
            target_suggestions.append(col)
            
    correlation_matrix = []
    if len(numeric_cols) > 1:
        corr_df = df[numeric_cols].corr().fillna(0)
        for i, row_col in enumerate(corr_df.columns):
            for j, col_col in enumerate(corr_df.columns):
                correlation_matrix.append({
                    "x": row_col,
                    "y": col_col,
                    "value": round(float(corr_df.iloc[i, j]), 2)
                })

    eda_data = {
        "num_rows": num_rows,
        "num_cols": num_cols,
        "duplicates": duplicates,
        "missing": missing_counts,
        "dtypes": dtypes,
        "outliers": outliers_count,
        "target_suggestions": target_suggestions,
        "correlation_matrix": correlation_matrix
    }

    eda_path = file_path.replace(f".{ext}", "_eda.json")
    with open(eda_path, "w") as f:
        json.dump(eda_data, f)
        
    schema_def = []
    for col in df.columns:
        scores = {"date": 0.0, "target": 0.0, "categorical": 0.0, "numerical": 0.0, "identifier": 0.0}
        col_type = str(df[col].dtype)
        unique_count = df[col].nunique()
        is_numeric = np.issubdtype(df[col].dtype, np.number)
    
        if "id" in col.lower() or "uuid" in col.lower():
            scores["identifier"] += 0.5
        if unique_count == num_rows:
            scores["identifier"] += 0.4
        
        if "date" in col.lower() or "time" in col.lower():
            scores["date"] += 0.5
        if "datetime" in col_type:
            scores["date"] += 0.9
        else:
            try:
                pd.to_datetime(df[col].dropna().head(10), format="mixed")
                scores["date"] += 0.7
            except:
                pass
    
        if not is_numeric:
            scores["categorical"] += 0.8
        if unique_count < 20:
            scores["categorical"] += 0.4
        
        if is_numeric and unique_count > 10:
            scores["numerical"] += 0.8
        
        if col in target_suggestions:
            scores["target"] += 0.9
        
        best_role = max(scores, key=scores.get)
        confidence = min(scores[best_role], 0.99)
        if confidence == 0:
            best_role = "ignore"
            confidence = 1.0
        
        schema_def.append({
            "name": col,
            "role": best_role,
            "confidence": confidence,
            "type": col_type
        })
    
    schema_path = file_path.replace(f".{ext}", "_schema.json")
    with open(schema_path, "w") as f:
        json.dump(schema_def, f)
        
    return num_rows, num_cols

async def profile_dataset(dataset_id: int, file_path: str, ext: str):
    from app.db.database import AsyncSessionLocal
    import asyncio
    async with AsyncSessionLocal() as db:
        async def set_status(s: str):
            async with db.begin():
                d = await db.get(Dataset, dataset_id)
                if d: d.status = s
                
        try:
            await set_status("validating")
            await asyncio.sleep(0.1)
            
            await set_status("reading")
            await asyncio.sleep(0.1)
            
            # Offload heavy pandas processing to a background thread with 30s timeout
            num_rows, num_cols = await asyncio.wait_for(
                asyncio.to_thread(_process_dataset_sync, file_path, ext),
                timeout=30.0
            )
            
            await set_status("cleaning")
            await asyncio.sleep(0.1)
            
            await set_status("generating_features")
            await asyncio.sleep(0.1)
            
            async with db.begin():
                dataset = await db.get(Dataset, dataset_id)
                if dataset:
                    dataset.num_rows = num_rows
                    dataset.num_columns = num_cols
                    dataset.status = "ready"
        except asyncio.TimeoutError:
            async with db.begin():
                dataset = await db.get(Dataset, dataset_id)
                if dataset:
                    dataset.status = "error"
                    dataset.error_message = "Processing exceeded 30 seconds timeout."
        except Exception as e:
            async with db.begin():
                dataset = await db.get(Dataset, dataset_id)
                if dataset:
                    dataset.status = "error"
                    dataset.error_message = str(e)


@router.get("/")
async def list_datasets(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Dataset).where(Dataset.user_id == current_user.id))
    return result.scalars().all()

@router.delete("/{dataset_id}")
async def delete_dataset(
    dataset_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = await db.get(Dataset, dataset_id)
    if not dataset or dataset.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    # Remove file
    path = os.path.join(UPLOAD_DIR, dataset.storage_path)
    if os.path.exists(path):
        os.remove(path)
        
    await db.delete(dataset)
    await db.commit()
    return {"message": "Dataset deleted"}

@router.get("/{dataset_id}/status")
async def get_dataset_status(
    dataset_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = await db.get(Dataset, dataset_id)
    if not dataset or dataset.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return {"status": dataset.status}

@router.put("/{dataset_id}/rename")
async def rename_dataset(
    dataset_id: int,
    payload: DatasetRename,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = await db.get(Dataset, dataset_id)
    if not dataset or dataset.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    dataset.name = payload.name
    await db.commit()
    return {"message": "Dataset renamed"}

@router.get("/{dataset_id}/preview")
async def preview_dataset(
    dataset_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = await db.get(Dataset, dataset_id)
    if not dataset or dataset.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    if dataset.status != "ready":
        raise HTTPException(status_code=400, detail="Dataset is not ready yet")
        
    path = os.path.join(UPLOAD_DIR, dataset.storage_path)
    try:
        if dataset.file_type == 'csv':
            df = pd.read_csv(path, nrows=5)
        elif dataset.file_type == 'xlsx':
            df = pd.read_excel(path, nrows=5)
        elif dataset.file_type == 'parquet':
            df = pd.read_parquet(path).head(5)
            
        return {
            "columns": df.columns.tolist(),
            "data": df.fillna("NaN").to_dict(orient="records")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{dataset_id}/eda")
async def get_dataset_eda(
    dataset_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = await db.get(Dataset, dataset_id)
    if not dataset or dataset.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    if dataset.status != "ready":
        raise HTTPException(status_code=400, detail="Dataset EDA is not ready yet")
        
    base_name = dataset.storage_path.rsplit('.', 1)[0]
    eda_path = os.path.join(UPLOAD_DIR, f"{base_name}_eda.json")
    
    if not os.path.exists(eda_path):
        raise HTTPException(status_code=404, detail="EDA data not found")
        
    with open(eda_path, "r") as f:
        return json.load(f)

@router.get("/{dataset_id}/schema")
async def get_dataset_schema(
    dataset_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = await db.get(Dataset, dataset_id)
    if not dataset or dataset.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    base_name = dataset.storage_path.rsplit('.', 1)[0]
    schema_path = os.path.join(UPLOAD_DIR, f"{base_name}_schema.json")
    
    if not os.path.exists(schema_path):
        raise HTTPException(status_code=404, detail="Schema data not found")
        
    with open(schema_path, "r") as f:
        return json.load(f)

@router.put("/{dataset_id}/schema")
async def update_dataset_schema(
    dataset_id: int,
    payload: DatasetSchemaUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = await db.get(Dataset, dataset_id)
    if not dataset or dataset.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    base_name = dataset.storage_path.rsplit('.', 1)[0]
    schema_path = os.path.join(UPLOAD_DIR, f"{base_name}_schema.json")
    
    with open(schema_path, "w") as f:
        json.dump([col.model_dump() for col in payload.columns], f)
        
    return {"message": "Schema updated successfully"}
