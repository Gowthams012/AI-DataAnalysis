import logging
from supabase import create_client, Client
from app.core.config import settings

log = logging.getLogger(__name__)

def get_supabase_client() -> Client | None:
    """Returns a Supabase client if configured, otherwise None."""
    if not settings.supabase_url or not settings.supabase_key:
        log.warning("Supabase URL or Key not set. Supabase features (Auth/Storage) will be disabled.")
        return None
        
    try:
        return create_client(settings.supabase_url, settings.supabase_key)
    except Exception as e:
        log.error("Failed to initialize Supabase client: %s", e)
        return None

supabase_client = get_supabase_client()
