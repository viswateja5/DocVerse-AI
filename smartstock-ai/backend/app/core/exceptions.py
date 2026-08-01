from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from app.core.logging import logger

class APIError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        self.message = message
        self.status_code = status_code

async def api_error_handler(request: Request, exc: APIError):
    logger.error("api_error", path=request.url.path, detail=exc.message, status_code=exc.status_code)
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.message}
    )

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning("validation_error", path=request.url.path, errors=exc.errors())
    return JSONResponse(
        status_code=422,
        content={"error": "Validation Error", "details": exc.errors()}
    )

async def global_exception_handler(request: Request, exc: Exception):
    logger.error("internal_server_error", path=request.url.path, error=str(exc), exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal Server Error"}
    )
