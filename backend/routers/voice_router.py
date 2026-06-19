import os
import logging
from pydantic import BaseModel
from fastapi import APIRouter, File, UploadFile, Depends, HTTPException, status
from fastapi.responses import FileResponse
from routers.auth import get_current_user
from models.db_models import User
from services.voice_service import transcribe_audio_whisper, text_to_speech_gtts

logger = logging.getLogger("rag-backend")
voice_router = APIRouter(prefix="/voice", tags=["Voice Conversational AI"])

class SpeakRequest(BaseModel):
    text: str

@voice_router.post("/transcribe")
async def transcribe_speech(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Accepts speech voice recording files and returns a text transcription string.
    """
    try:
        content = await file.read()
        transcription = await transcribe_audio_whisper(content, file.filename)
        return {"text": transcription}
    except Exception as e:
        logger.error(f"Speech transcription API failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Speech-to-Text conversion failed: {str(e)}"
        )

@voice_router.post("/speak")
async def speak_text(
    body: SpeakRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Accepts text strings and returns a streaming MP3 audio file.
    """
    try:
        mp3_path = text_to_speech_gtts(body.text)
        
        # Define clean up hook to delete temp file after connection closes
        def cleanup():
            if os.path.exists(mp3_path):
                os.remove(mp3_path)
                logger.info(f"Cleaned up voice temp file: {mp3_path}")
                
        return FileResponse(
            path=mp3_path, 
            media_type="audio/mpeg", 
            filename="response.mp3",
            background=cleanup  # Background tasks runner handles cleanup
        )
    except Exception as e:
        logger.error(f"Text-to-Speech API failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Text-to-Speech synthesis failed: {str(e)}"
        )
