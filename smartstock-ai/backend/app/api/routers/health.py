from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
def health_check():
    """
    Health check endpoint to ensure the API is running.
    """
    return {"status": "ok", "message": "SmartStock AI Backend is healthy"}
