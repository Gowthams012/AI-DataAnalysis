"""
AI Data Analyst — FastAPI Application Entry Point
"""
import structlog
import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.database import engine, Base
import app.models.domain  # ensures models are registered

log = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("AI Data Analyst starting up", version="1.0.0", llm=settings.llm_provider)
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
            conn.commit()
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        log.info("Database tables initialized.")
    except Exception as e:
        log.error(f"Could not initialize database tables: {e}")
    yield
    log.info("AI Data Analyst shutting down")


app = FastAPI(
    title="AI Data Analyst",
    description=(
        "An AI-powered data analysis platform that enables natural language "
        "interaction with CSV data. Upload CSV files and ask questions in plain "
        "English to get insights, visualizations, anomaly detection, and more."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")


@app.get("/health", tags=["health"])
async def health_check():
    """Health check endpoint."""
    return {
        "status": "ok",
        "version": "1.0.0",
        "llm_provider": settings.llm_provider,
    }


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
