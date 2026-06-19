import io
import base64
import logging
from PIL import Image
from langchain_core.messages import HumanMessage
from services.llm_factory import get_llm

logger = logging.getLogger("rag-backend")

async def extract_text_from_image(image_bytes: bytes, filename: str) -> str:
    """
    Extracts text from an image. First tries local pytesseract OCR, 
    falling back automatically to OpenAI/Gemini Vision API if local binary is missing or fails.
    """
    # 1. Try pytesseract first
    try:
        import pytesseract
        image = Image.open(io.BytesIO(image_bytes))
        # Ensure tesseract is present in path
        text = pytesseract.image_to_string(image)
        if text.strip():
            logger.info("pytesseract extracted text successfully.")
            return text
    except Exception as e:
        logger.warning(f"Local pytesseract failed or not configured: {e}. Falling back to LLM Vision OCR...")

    # 2. LLM Vision fallback
    prompt = "Extract all readable text from this image or screenshot. Respond ONLY with the extracted text, formatted cleanly. Do not explain or add commentary."
    try:
        text = await explain_image_llm(image_bytes, prompt)
        logger.info("LLM Vision OCR extracted text successfully.")
        return text
    except Exception as e:
        logger.error(f"LLM Vision OCR fallback failed: {e}", exc_info=True)
        raise e

async def explain_image_llm(image_bytes: bytes, prompt: str) -> str:
    """
    Calls ChatOpenAI / ChatGemini with base64 image data to explain or extract text.
    """
    base64_image = base64.b64encode(image_bytes).decode("utf-8")
    
    # Standard LangChain multimodal message format
    message = HumanMessage(
        content=[
            {"type": "text", "text": prompt},
            {
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/jpeg;base64,{base64_image}"
                }
            }
        ]
    )
    
    llm = get_llm(streaming=False)
    res = await llm.ainvoke([message])
    return res.content
