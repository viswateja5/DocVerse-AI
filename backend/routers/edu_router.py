import logging
from fastapi import APIRouter, Query, Depends, HTTPException, status
from routers.auth import get_current_user
from models.db_models import User
from services.educational_service import generate_educational_content

logger = logging.getLogger("rag-backend")
edu_router = APIRouter(prefix="/edu", tags=["Educational Content Generator"])

@edu_router.get("/generate")
async def generate_study_materials(
    session_id: str = Query(..., description="Active session ID context"),
    content_type: str = Query(..., description="'mcqs' | 'flashcards' | 'interview' | 'notes'"),
    difficulty: str = Query("medium", description="'easy' | 'medium' | 'hard'"),
    count: int = Query(5, description="Number of questions/items to generate", ge=1, le=25),
    current_user: User = Depends(get_current_user)
):
    """
    Dynamically compiles interactive quizzes, flashcards, or interview preparations
    tailored to the document context of the active session.
    """
    if content_type not in ["mcqs", "flashcards", "interview", "notes"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid content_type. Supported options: mcqs, flashcards, interview, notes."
        )
        
    if difficulty not in ["easy", "medium", "hard"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid difficulty level. Supported options: easy, medium, hard."
        )
        
    try:
        content = await generate_educational_content(content_type, difficulty, session_id, count=count)
        if "error" in content:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=content["error"]
            )
        return content
    except Exception as e:
        logger.error(f"Failed to generate study materials: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Study generation failed: {str(e)}"
        )
