import datetime
import uuid
from typing import Any, Dict

from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, Integer, Text, Boolean
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector

from app.core.database import Base


def generate_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, index=True) # Supabase UUID
    email = Column(String, unique=True, index=True, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")


class Session(Base):
    __tablename__ = "sessions"

    session_id = Column(String, primary_key=True, default=generate_uuid, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    last_active = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="sessions")
    files = relationship("FileRecord", back_populates="session", cascade="all, delete-orphan")
    messages = relationship("ConversationMessage", back_populates="session", cascade="all, delete-orphan")


class FileRecord(Base):
    __tablename__ = "file_records"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    session_id = Column(String, ForeignKey("sessions.session_id"), nullable=False, index=True)
    filename = Column(String, nullable=False)
    
    # Path in Supabase storage (e.g. datasets/user_id/file_id.csv)
    storage_path = Column(String, nullable=False)
    
    # Pre-computed summaries
    schema_summary = Column(Text, nullable=False)
    profile = Column(JSON, nullable=False)
    
    uploaded_at = Column(DateTime, default=datetime.datetime.utcnow)

    session = relationship("Session", back_populates="files")
    chunks = relationship("DocumentChunk", back_populates="file_record", cascade="all, delete-orphan")


class ConversationMessage(Base):
    __tablename__ = "conversation_messages"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    session_id = Column(String, ForeignKey("sessions.session_id"), nullable=False, index=True)
    role = Column(String, nullable=False) # "user" | "assistant"
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    session = relationship("Session", back_populates="messages")


class DocumentChunk(Base):
    """For Future RAG features using pgvector"""
    __tablename__ = "document_chunks"

    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    file_id = Column(String, ForeignKey("file_records.id"), nullable=False, index=True)
    content = Column(Text, nullable=False)
    embedding = Column(Vector(1536)) # Assuming OpenAI 1536 dim embeddings
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    file_record = relationship("FileRecord", back_populates="chunks")
