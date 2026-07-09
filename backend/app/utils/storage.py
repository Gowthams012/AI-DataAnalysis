import io
import os
import logging
from typing import Optional

from app.core.supabase_client import supabase_client

log = logging.getLogger(__name__)

BUCKET_NAME = "datasets"
LOCAL_STORAGE_DIR = "data/uploads"

# Ensure local dir exists for fallback
os.makedirs(LOCAL_STORAGE_DIR, exist_ok=True)

def upload_file(user_id: str, session_id: str, file_id: str, filename: str, content: bytes) -> str:
    """
    Uploads a file to Supabase storage or local fallback.
    Returns the storage path.
    """
    # Create a unique path: datasets/user_id/session_id/file_id_filename
    # If anonymous (no user_id), use "anonymous"
    uid = user_id or "anonymous"
    storage_path = f"{uid}/{session_id}/{file_id}_{filename}"

    if supabase_client:
        try:
            # We assume the bucket 'datasets' is already created in Supabase
            supabase_client.storage.from_(BUCKET_NAME).upload(
                path=storage_path,
                file=content,
                file_options={"content-type": "text/csv"}
            )
            log.info("Uploaded to Supabase storage: %s", storage_path)
            return storage_path
        except Exception as e:
            log.error("Failed to upload to Supabase, falling back to local: %s", e)
    
    # Local fallback
    local_path = os.path.join(LOCAL_STORAGE_DIR, f"{uid}_{session_id}_{file_id}_{filename}")
    with open(local_path, "wb") as f:
        f.write(content)
    log.info("Uploaded to local storage: %s", local_path)
    return f"local://{local_path}"


def download_file(storage_path: str) -> bytes:
    """
    Downloads a file from Supabase storage or local fallback.
    """
    if storage_path.startswith("local://"):
        local_path = storage_path.replace("local://", "")
        with open(local_path, "rb") as f:
            return f.read()
            
    if supabase_client:
        try:
            response = supabase_client.storage.from_(BUCKET_NAME).download(storage_path)
            return response
        except Exception as e:
            log.error("Failed to download from Supabase: %s", e)
            raise ValueError(f"Could not download file from storage: {e}")
            
    raise ValueError("Supabase client not configured and file is not local.")

def delete_file(storage_path: str) -> bool:
    """
    Deletes a file from Supabase storage or local fallback.
    """
    if storage_path.startswith("local://"):
        local_path = storage_path.replace("local://", "")
        if os.path.exists(local_path):
            os.remove(local_path)
            return True
        return False
        
    if supabase_client:
        try:
            supabase_client.storage.from_(BUCKET_NAME).remove([storage_path])
            return True
        except Exception as e:
            log.error("Failed to delete from Supabase: %s", e)
            return False
            
    return False
