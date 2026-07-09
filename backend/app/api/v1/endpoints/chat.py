"""Chat endpoint — NL question answering with code execution."""
import structlog
import traceback
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse

from app.api.deps import get_current_user
from app.models.domain import User

from app.core.session_manager import session_manager
from app.models.schemas import ChatRequest, ChatResponse, ConversationHistoryResponse, ConversationMessage
from app.services import chat_service

router = APIRouter()
log = structlog.get_logger(__name__)


@router.post("/chat", response_model=ChatResponse, summary="Chat with your data")
async def chat(request: ChatRequest, user: User = Depends(get_current_user)):
    """
    Ask a natural language question about the uploaded data.

    The AI will:
    - Answer the question with reasoning
    - Generate Pandas/SQL code when appropriate
    - Return chart specifications for visual questions
    - Execute the code and return real computed results
    - Maintain conversation context across calls
    """
    session = session_manager.get_session(request.session_id, user)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session '{request.session_id}' not found.")
    if not session.files:
        raise HTTPException(status_code=400, detail="No files uploaded. Upload a CSV first.")

    try:
        response = await chat_service.chat(request.session_id, request.message)
        return response
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        traceback.print_exc()
        log.error("chat.error", session_id=request.session_id, error=str(exc))
        raise HTTPException(status_code=500, detail=f"Chat error: {exc}")


@router.get(
    "/chat/history/{session_id}",
    response_model=ConversationHistoryResponse,
    summary="Get conversation history",
)
async def get_history(session_id: str, user: User = Depends(get_current_user)):
    """Return the full conversation history for a session."""
    session = session_manager.get_session(session_id, user)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found.")

    messages = [
        ConversationMessage(
            role=m.role,
            content=m.content,
            timestamp=m.timestamp,
        )
        for m in session.conversation
    ]
    return ConversationHistoryResponse(session_id=session_id, messages=messages)


@router.delete("/chat/history/{session_id}", summary="Clear conversation history")
async def clear_history(session_id: str, user: User = Depends(get_current_user)):
    """Clear conversation history while keeping uploaded files."""
    session = session_manager.get_session(session_id, user)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found.")
    session_manager.clear_conversation(session_id)
    return {"message": "Conversation history cleared."}
