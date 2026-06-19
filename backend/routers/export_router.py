import logging
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from database.connection import get_db
from routers.auth import get_current_user
from models.db_models import User, ChatSession
from services.export_service import export_session_markdown, export_session_html

logger = logging.getLogger("rag-backend")
export_router = APIRouter(prefix="/export", tags=["Chat History Exporters"])

@export_router.get("/session/{session_id}")
async def export_chat_session(
    session_id: str,
    format: str = Query("markdown", description="'markdown' | 'docx' | 'html' | 'pdf'"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Exports full chat session history and citations to MD, HTML, or DOCX formats.
    """
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user.id
        )
    )
    session = result.scalars().first()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Chat session '{session_id}' not found."
        )
        
    if format not in ["markdown", "docx", "html", "pdf"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported format. Supported: markdown, docx, html, pdf."
        )
        
    try:
        if format == "markdown":
            content = export_session_markdown(session)
            media_type = "text/markdown"
            filename = f"session_{session_id}.md"
        else:
            # HTML formats open directly in browser/Word
            content = export_session_html(session)
            media_type = "text/html"
            filename = f"session_{session_id}.html" if format != "docx" else f"session_{session_id}.docx"
            
        return Response(
            content=content,
            media_type=media_type,
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    except Exception as e:
        logger.error(f"Failed to export chat logs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Export failed: {str(e)}"
        )
