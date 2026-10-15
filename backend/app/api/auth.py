from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.database import get_db
from backend.app.models.user import User
from backend.app.schemas.auth import LoginRequest, TokenResponse, UserResponse
from backend.app.services.auth_service import verify_password, create_access_token
from backend.app.api.deps import require_authenticated_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Authenticates analyst or admin credentials and issues a JWT token."""
    user = db.query(User).filter(User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": user.username, "role": user.role})
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        role=user.role,
        username=user.username,
        full_name=user.full_name
    )


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(user: User = Depends(require_authenticated_user)):
    """Returns profile of currently authenticated user."""
    return UserResponse(
        id=user.id,
        username=user.username,
        role=user.role,
        full_name=user.full_name
    )
