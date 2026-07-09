"""Upload endpoint — accepts one or more CSV files, returns session + profiles."""
import structlog
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends
from typing import List, Optional
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.domain import User
from app.core.session_manager import get_or_create, add_file
from app.utils.storage import upload_file
from app.models.schemas import UploadResponse
from app.services.csv_service import profile_dataframe, validate_and_parse, build_schema_summary

router = APIRouter()
log = structlog.get_logger(__name__)


@router.post("/upload", response_model=UploadResponse, summary="Upload one or more CSV files")
async def upload_files(
    files: List[UploadFile] = File(..., description="CSV file(s) to analyze"),
    session_id: Optional[str] = Form(None, description="Existing session ID (optional)"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Upload one or more CSV files to a session.

    - Creates a new session if no ``session_id`` is provided.
    - Validates each file (type, size, parsability).
    - Returns file profiles and the session ID to use in subsequent calls.
    """
    if len(files) > settings.max_files_per_session:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum {settings.max_files_per_session} files per session.",
        )

    session = get_or_create(db, session_id, user)

    profiles = []
    for upload in files:
        try:
            content = await upload.read()
            df = validate_and_parse(upload.filename or "upload.csv", content)
            
            # Upload to Storage (Supabase or Local)
            storage_path = upload_file(
                user_id=user.id if user else "",
                session_id=session.session_id,
                file_id=upload.filename or "upload.csv",
                filename=upload.filename or "upload.csv",
                content=content
            )
            
            schema_summary = build_schema_summary(df, upload.filename or "upload.csv")
            profile_dict = profile_dataframe(df, upload.filename or "upload.csv")
            
            # Save to DB
            add_file(
                db=db,
                session_id=session.session_id,
                filename=upload.filename or "upload.csv",
                storage_path=storage_path,
                schema_summary=schema_summary,
                profile=profile_dict.model_dump()
            )
            
            profiles.append(profile_dict)
            log.info("upload.success", session_id=session.session_id, file=upload.filename)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc))
        except Exception as exc:
            log.error("upload.error", file=upload.filename, error=str(exc))
            raise HTTPException(status_code=500, detail=f"Error processing {upload.filename}: {exc}")

    return UploadResponse(
        session_id=session.session_id,
        files=profiles,
        message=f"Successfully uploaded {len(profiles)} file(s).",
    )
