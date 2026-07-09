"""Sessions endpoint — session info, file management, export."""
import json
import structlog
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse

from app.core.session_manager import session_manager
from app.models.schemas import DeleteFileResponse, SessionDetailResponse, FileProfile, SessionInfo
from app.api.deps import get_current_user
from app.models.domain import User

router = APIRouter()
log = structlog.get_logger(__name__)


@router.get("/sessions", response_model=list[SessionInfo], summary="List user sessions")
async def list_user_sessions(user: User = Depends(get_current_user)):
    """List all sessions belonging to the current user."""
    from app.core.database import SessionLocal
    from app.core.session_manager import list_sessions
    db = SessionLocal()
    try:
        sessions = list_sessions(db, user)
        return [SessionInfo(**s) for s in sessions]
    finally:
        db.close()


@router.get("/sessions/{session_id}", response_model=SessionDetailResponse, summary="Get session details")
async def get_session(session_id: str, user: User = Depends(get_current_user)):
    """Return file profiles and metadata for a session."""
    session = session_manager.get_session(session_id, user)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found.")

    files = [FileProfile(**rec.profile) for rec in session.files.values()]
    return SessionDetailResponse(
        session_id=session.session_id,
        files=files,
        message_count=len(session.conversation),
        created_at=session.created_at.isoformat(),
        last_active=session.last_active.isoformat(),
    )


@router.delete("/sessions/{session_id}", summary="Delete a session")
async def delete_session(session_id: str, user: User = Depends(get_current_user)):
    """Delete a session and free all associated resources."""
    success = session_manager.delete_session(session_id, user)
    if not success:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found.")
    return {"message": f"Session '{session_id}' deleted successfully."}


@router.delete(
    "/sessions/{session_id}/files/{filename}",
    response_model=DeleteFileResponse,
    summary="Remove a file from a session",
)
async def remove_file(session_id: str, filename: str, user: User = Depends(get_current_user)):
    """Remove a specific file from a session."""
    session = session_manager.get_session(session_id, user)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found.")

    success = session_manager.remove_file(session_id, filename)
    if not success:
        raise HTTPException(status_code=404, detail=f"File '{filename}' not in session.")

    return DeleteFileResponse(success=True, message=f"File '{filename}' removed.")


@router.get("/sessions/{session_id}/export", summary="Export analysis report as JSON")
async def export_report(session_id: str, user: User = Depends(get_current_user)):
    """
    Export the full session data as a JSON report including:
    - File profiles
    - Conversation history
    """
    session = session_manager.get_session(session_id, user)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found.")

    report = {
        "session_id": session_id,
        "created_at": session.created_at.isoformat(),
        "exported_at": __import__("datetime").datetime.utcnow().isoformat(),
        "files": [
            {
                "filename": rec.filename,
                "rows": rec.profile["rows"],
                "columns": rec.profile["columns"],
            }
            for rec in session.files.values()
        ],
        "conversation": [
            {
                "role": m.role,
                "content": m.content,
                "timestamp": m.timestamp.isoformat(),
            }
            for m in session.conversation
        ],
    }

    return JSONResponse(
        content=report,
        headers={
            "Content-Disposition": f'attachment; filename="report_{session_id[:8]}.json"'
        },
    )
