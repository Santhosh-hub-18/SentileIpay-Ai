from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str = Field(..., description="Analyst or Admin username")
    password: str = Field(..., description="Account password")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    username: str
    full_name: str


class UserResponse(BaseModel):
    id: str
    username: str
    role: str
    full_name: str
