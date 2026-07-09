from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from supabase import Client

from app.core.database import get_db
from app.core.supabase_client import supabase_client
from app.models.domain import User

security = HTTPBearer(auto_error=True)

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Strict authentication dependency.
    Verifies the token with Supabase and returns the User.
    Raises 401 Unauthorized if the token is missing or invalid.
    """
    if not supabase_client:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase client not configured."
        )
        
    token = credentials.credentials
    try:
        # Verify the JWT using Supabase
        user_resp = supabase_client.auth.get_user(token)
        if not user_resp or not user_resp.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        supabase_user = user_resp.user
        
        # Upsert the user into our local PostgreSQL database
        db_user = db.query(User).filter(User.id == supabase_user.id).first()
        if not db_user:
            db_user = User(
                id=supabase_user.id,
                email=supabase_user.email
            )
            db.add(db_user)
            db.commit()
            db.refresh(db_user)
            
        return db_user
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
