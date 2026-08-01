from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from jose import jwt, JWTError
from fastapi.security import OAuth2PasswordRequestForm

from app.core.config import settings
from app.core.exceptions import APIError
from app.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token
from app.models.user import User
from app.schemas.auth import UserCreate, RefreshRequest, TokenPayload
from app.services.audit_service import AuditService

class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_user_by_email(self, email: str) -> User | None:
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalars().first()

    async def authenticate_user(self, form_data: OAuth2PasswordRequestForm, endpoint: str) -> dict:
        user = await self.get_user_by_email(form_data.username)
        
        if not user or not verify_password(form_data.password, user.hashed_password):
            raise APIError("Incorrect email or password", status_code=401)
            
        if not user.is_active:
            raise APIError("Inactive user", status_code=400)

        await AuditService.log_action(self.db, user.id, "LOGIN", endpoint)

        return self._generate_tokens(user)

    async def register_user(self, user_in: UserCreate, endpoint: str) -> User:
        existing_user = await self.get_user_by_email(user_in.email)
        if existing_user:
            raise APIError("Email already registered", status_code=409)
            
        new_user = User(
            email=user_in.email,
            hashed_password=get_password_hash(user_in.password),
            role=user_in.role
        )
        self.db.add(new_user)
        await self.db.commit()
        await self.db.refresh(new_user)
        
        await AuditService.log_action(self.db, new_user.id, "REGISTER", endpoint)
        return new_user

    async def refresh_token(self, req: RefreshRequest, endpoint: str) -> dict:
        try:
            payload = jwt.decode(req.refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            token_data = TokenPayload(**payload)
            if token_data.type != "refresh":
                raise APIError("Could not validate refresh token", status_code=401)
        except JWTError:
            raise APIError("Could not validate refresh token", status_code=401)
            
        result = await self.db.execute(select(User).where(User.id == token_data.sub))
        user = result.scalars().first()
        
        if not user or not user.is_active:
            raise APIError("User not found or inactive", status_code=401)
            
        await AuditService.log_action(self.db, user.id, "REFRESH_TOKEN", endpoint)
        return self._generate_tokens(user)

    def _generate_tokens(self, user: User) -> dict:
        return {
            "access_token": create_access_token(user.id, user.role),
            "refresh_token": create_refresh_token(user.id),
            "token_type": "bearer"
        }
