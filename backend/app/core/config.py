"""Application configuration — reads from .env file."""
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ── LLM Provider ─────────────────────────────────────────────
    llm_provider: str = "gemini"          # "gemini" or "openai"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    
    openrouter_api_key: str = ""
    openrouter_model: str = "openrouter/anthropic/claude-3-haiku"
    
    groq_api_key: str = ""
    groq_model: str = "groq/llama-3.3-70b-versatile"
    
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"

    # ── Database & Supabase ──────────────────────────────────────
    database_url: str = ""
    supabase_url: str = ""
    supabase_key: str = ""
    supabase_jwt_secret: str = ""
    
    # ── Redis Cache ──────────────────────────────────────────────
    redis_url: str = "redis://localhost:6379"

    # ── Server ───────────────────────────────────────────────────
    cors_origins: List[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
    ]

    # ── File Limits ──────────────────────────────────────────────
    max_file_size_mb: int = 50
    max_files_per_session: int = 10

    # ── Data Processing ──────────────────────────────────────────
    max_rows_preview: int = 5         # rows shown in schema preview
    max_context_rows: int = 100       # max sample rows sent to LLM
    max_conversation_history: int = 20  # messages kept in LLM context

    # ── Code Execution ───────────────────────────────────────────
    code_execution_timeout: int = 30  # seconds

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
