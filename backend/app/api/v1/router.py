"""V1 API router — aggregates all endpoint routers."""
from fastapi import APIRouter

from app.api.v1.endpoints import analytics, chat, sessions, upload

api_router = APIRouter()

api_router.include_router(upload.router, tags=["upload"])
api_router.include_router(chat.router, tags=["chat"])
api_router.include_router(analytics.router, tags=["analytics"])
api_router.include_router(sessions.router, tags=["sessions"])
