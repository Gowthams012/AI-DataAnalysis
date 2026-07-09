import uuid
import datetime
from typing import Optional, List, Dict
import pandas as pd
import json

from sqlalchemy.orm import Session
from app.models.domain import Session as DBSession, FileRecord, ConversationMessage, User
from app.utils.storage import download_file
import structlog

log = structlog.get_logger(__name__)

# To maintain backwards compatibility with the previous return types (dataclasses),
# we define proxy data classes that mimic the old objects.
from dataclasses import dataclass, field

@dataclass
class LegacyConversationMessage:
    role: str
    content: str
    timestamp: datetime.datetime = field(default_factory=datetime.datetime.utcnow)

@dataclass
class LegacyFileRecord:
    filename: str
    df: pd.DataFrame
    schema_summary: str
    profile: dict
    uploaded_at: datetime.datetime = field(default_factory=datetime.datetime.utcnow)
    
@dataclass
class LegacySession:
    session_id: str
    files: Dict[str, LegacyFileRecord] = field(default_factory=dict)
    conversation: List[LegacyConversationMessage] = field(default_factory=list)
    created_at: datetime.datetime = field(default_factory=datetime.datetime.utcnow)
    last_active: datetime.datetime = field(default_factory=datetime.datetime.utcnow)


def get_session(db: Session, session_id: str, user: Optional[User] = None) -> Optional[LegacySession]:
    """Retrieve a session from the DB and map it to the legacy format."""
    query = db.query(DBSession).filter(DBSession.session_id == session_id)
    if user:
        from sqlalchemy import or_
        query = query.filter(or_(DBSession.user_id == user.id, DBSession.user_id == None))
        
    db_session = query.first()
    if not db_session:
        return None
        
    # Claim anonymous session for the logged-in user
    if user and db_session.user_id is None:
        db_session.user_id = user.id
        
    db_session.last_active = datetime.datetime.utcnow()
    db.commit()
    
    files = {}
    for f in db_session.files:
        try:
            # Download the file content from storage (lazy loading df if needed, but doing it here for now to avoid breaking existing code)
            content = download_file(f.storage_path)
            import io
            df = pd.read_csv(io.BytesIO(content), low_memory=False)
            files[f.filename] = LegacyFileRecord(
                filename=f.filename,
                df=df,
                schema_summary=f.schema_summary,
                profile=f.profile,
                uploaded_at=f.uploaded_at
            )
        except Exception as e:
            log.warning("session.file_download_failed", file=f.filename, error=str(e))
            # Skip this file if it cannot be downloaded so the session still loads
            pass
        
    conversation = [
        LegacyConversationMessage(
            role=m.role,
            content=m.content,
            timestamp=m.timestamp
        )
        for m in sorted(db_session.messages, key=lambda x: x.timestamp)
    ]
    
    return LegacySession(
        session_id=db_session.session_id,
        files=files,
        conversation=conversation,
        created_at=db_session.created_at,
        last_active=db_session.last_active
    )

def create_session(db: Session, user: Optional[User] = None) -> LegacySession:
    db_session = DBSession(
        user_id=user.id if user else None
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    log.info("session.created", session_id=db_session.session_id)
    return LegacySession(session_id=db_session.session_id)

def get_or_create(db: Session, session_id: Optional[str] = None, user: Optional[User] = None) -> LegacySession:
    if session_id:
        s = get_session(db, session_id)
        if s:
            return s
    return create_session(db, user)

def delete_session(db: Session, session_id: str, user: Optional[User] = None) -> bool:
    query = db.query(DBSession).filter(DBSession.session_id == session_id)
    if user:
        query = query.filter(DBSession.user_id == user.id)
    db_session = query.first()
    if db_session:
        # We should also delete files from storage ideally, but skipping for brevity
        db.delete(db_session)
        db.commit()
        log.info("session.deleted", session_id=session_id)
        return True
    return False

def remove_file(db: Session, session_id: str, filename: str) -> bool:
    fr = db.query(FileRecord).filter(
        FileRecord.session_id == session_id,
        FileRecord.filename == filename
    ).first()
    if fr:
        from app.utils.storage import delete_file
        delete_file(fr.storage_path)
        db.delete(fr)
        db.commit()
        log.info("session.file_removed", session_id=session_id, file=filename)
        return True
    return False

def add_file(db: Session, session_id: str, filename: str, storage_path: str, schema_summary: str, profile: dict) -> None:
    fr = FileRecord(
        session_id=session_id,
        filename=filename,
        storage_path=storage_path,
        schema_summary=schema_summary,
        profile=profile
    )
    db.add(fr)
    db.commit()
    log.info("session.file_added", session_id=session_id, file=filename)

def add_message(db: Session, session_id: str, role: str, content: str) -> None:
    msg = ConversationMessage(
        session_id=session_id,
        role=role,
        content=content
    )
    db.add(msg)
    db.commit()

def clear_conversation(db: Session, session_id: str) -> None:
    db.query(ConversationMessage).filter(ConversationMessage.session_id == session_id).delete()
    db.commit()

def list_sessions(db: Session, user: Optional[User] = None) -> List[dict]:
    query = db.query(DBSession)
    if user:
        query = query.filter(DBSession.user_id == user.id)
        
    db_sessions = query.all()
    return [
        {
            "session_id": s.session_id,
            "file_count": len(s.files),
            "message_count": len(s.messages),
            "created_at": s.created_at.isoformat(),
            "last_active": s.last_active.isoformat(),
        }
        for s in db_sessions
    ]

# Compatibility stub for services that import `session_manager.get_session` directly
# We provide a wrapper that creates its own db session. This is a temporary bridge 
# until all services are fully dependency-injected.
from app.core.database import SessionLocal
class SessionManagerCompat:
    def get_session(self, session_id: str, user: Optional[User] = None):
        db = SessionLocal()
        try:
            return get_session(db, session_id, user)
        finally:
            db.close()
            
    def get_or_create(self, session_id: Optional[str] = None, user: Optional[User] = None):
        db = SessionLocal()
        try:
            return get_or_create(db, session_id, user)
        finally:
            db.close()
            
    def delete_session(self, session_id: str, user: Optional[User] = None):
        db = SessionLocal()
        try:
            return delete_session(db, session_id, user)
        finally:
            db.close()

    def remove_file(self, session_id: str, filename: str):
        db = SessionLocal()
        try:
            return remove_file(db, session_id, filename)
        finally:
            db.close()
            
    def add_message(self, session_id: str, role: str, content: str):
        db = SessionLocal()
        try:
            add_message(db, session_id, role, content)
        finally:
            db.close()
            
    def clear_conversation(self, session_id: str):
        db = SessionLocal()
        try:
            clear_conversation(db, session_id)
        finally:
            db.close()
            
session_manager = SessionManagerCompat()
