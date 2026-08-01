from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None
    type: Optional[str] = None

class UserBase(BaseModel):
    email: EmailStr
    role: str = "viewer"

class UserCreate(UserBase):
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")

class UserResponse(UserBase):
    id: str
    is_active: bool

    class Config:
        from_attributes = True

class RefreshRequest(BaseModel):
    refresh_token: str
