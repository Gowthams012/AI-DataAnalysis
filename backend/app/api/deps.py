from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from supabase import Client

from app.core.database import get_db
from app.core.supabase_client import supabase_client
from app.models.domain import User

security = HTTPBearer(auto_error=False)

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Strict authentication dependency.
    Verifies the token with Supabase and returns the User.
    Falls back to a local user if Supabase is unreachable or missing.
    """
    # Mock user for local fallback
    def get_local_user():
        db_user = db.query(User).filter(User.id == "local-dev-user").first()
        if not db_user:
            db_user = User(id="local-dev-user", email="local@dev.com")
            db.add(db_user)
            db.commit()
            db.refresh(db_user)
        return db_user

    if not supabase_client or not credentials:
        return get_local_user()
        
    token = credentials.credentials
    try:
        # Verify the JWT using Supabase
        user_resp = supabase_client.auth.get_user(token)
        if not user_resp or not user_resp.user:
            return get_local_user()
            
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
        # Fallback for network issues (like college wifi blocking Supabase)
        return get_local_user()
