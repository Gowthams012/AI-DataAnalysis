import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.domain import User

security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Validate the JWT token and return the associated User.
    If the user does not exist in the database, create a new record.
    """
    if not settings.supabase_jwt_secret:
        # In a development environment without auth configured, we might want to bypass or fail explicitly.
        # For this Phase 1 requirement, we enforce auth.
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server configuration error: JWT secret is not set."
        )

    try:
        # Supabase JWTs are signed with the HS256 algorithm and the project's JWT secret
        payload = jwt.decode(
            credentials.credentials,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            options={"verify_aud": False} # Supabase aud is usually 'authenticated', but safely ignore if not strict
        )
        
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload: missing 'sub'.",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        # Optional: extract email if present in the payload (Supabase typically includes it)
        email: str | None = payload.get("email")

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.PyJWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Look up the user in the database
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        # Create the user on their first authenticated API request
        user = User(id=user_id, email=email)
        db.add(user)
        try:
            db.commit()
            db.refresh(user)
        except Exception:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Could not create user record."
            )

    return user

def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer(auto_error=False)),
    db: Session = Depends(get_db)
) -> User | None:
    """
    Try to extract and validate the JWT token.
    Return None if missing or invalid, allowing public access to some endpoints.
    """
    if not credentials:
        return None
    try:
        return get_current_user(credentials, db)
    except HTTPException:
        return None
