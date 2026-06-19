import os
import logging
import tempfile
from gtts import gTTS
from openai import OpenAI

logger = logging.getLogger("rag-backend")

def get_openai_client() -> OpenAI:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY environment variable is missing.")
    return OpenAI(api_key=api_key)

async def transcribe_audio_whisper(audio_bytes: bytes, original_filename: str) -> str:
    """
    Transcribes uploaded audio bytes using OpenAI Whisper API.
    Saves bytes to a temporary file first.
    """
    ext = os.path.splitext(original_filename)[1] or ".wav"
    
    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as temp_file:
        temp_file.write(audio_bytes)
        temp_path = temp_file.name
        
    try:
        # Run Whisper API request in event loop executor to prevent blocking
        import asyncio
        loop = asyncio.get_event_loop()
        
        def run_whisper():
            client = get_openai_client()
            with open(temp_path, "rb") as f:
                transcription = client.audio.transcriptions.create(
                    model="whisper-1", 
                    file=f
                )
            return transcription.text
            
        text = await loop.run_in_executor(None, run_whisper)
        logger.info(f"Audio transcription successful. Length: {len(text)} chars.")
        return text
    except Exception as e:
        logger.error(f"Whisper transcription failed: {e}", exc_info=True)
        raise e
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

def text_to_speech_gtts(text: str) -> str:
    """
    Converts text to an MP3 speech file using the gTTS library.
    Returns the path to the generated temporary file.
    """
    try:
        tts = gTTS(text=text, lang="en")
        
        # Save to a temporary file in uploads directory so we can clean it up later
        os.makedirs("uploads", exist_ok=True)
        temp_file = tempfile.NamedTemporaryFile(dir="uploads", suffix=".mp3", delete=False)
        temp_path = temp_file.name
        temp_file.close()
        
        tts.save(temp_path)
        logger.info(f"gTTS speech generation successful: {temp_path}")
        return temp_path
    except Exception as e:
        logger.error(f"gTTS speech generation failed: {e}", exc_info=True)
        raise e
