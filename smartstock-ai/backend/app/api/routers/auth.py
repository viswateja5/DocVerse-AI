from fastapi import APIRouter, Depends, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.user import User
from app.schemas.auth import Token, UserCreate, UserResponse, RefreshRequest
from app.services.auth_service import AuthService
from app.api.deps import get_current_user

router = APIRouter()

def get_auth_service(db: AsyncSession = Depends(get_db)) -> AuthService:
    return AuthService(db)

@router.post("/login", response_model=Token)
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    auth_service: AuthService = Depends(get_auth_service)
):
    return await auth_service.authenticate_user(form_data, request.url.path)

@router.post("/refresh", response_model=Token)
async def refresh_token(
    request: Request,
    req: RefreshRequest,
    auth_service: AuthService = Depends(get_auth_service)
):
    return await auth_service.refresh_token(req, request.url.path)

@router.post("/register", response_model=UserResponse)
async def register(
    request: Request,
    user_in: UserCreate,
    auth_service: AuthService = Depends(get_auth_service)
):
    return await auth_service.register_user(user_in, request.url.path)

@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user
