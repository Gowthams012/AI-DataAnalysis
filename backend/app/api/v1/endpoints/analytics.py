"""Analytics endpoints — insights, anomalies, charts, data quality."""
import structlog
from fastapi import APIRouter, HTTPException, Depends

from app.api.deps import get_current_user
from app.models.domain import User

from app.core.session_manager import session_manager
from app.models.schemas import (
    AnalyticsRequest,
    AnomalyResponse,
    ChartRequest,
    ChartSpec,
    DataQualityResponse,
    InsightsResponse,
    DashboardResponse,
)
from app.services import analytics_service

router = APIRouter()
log = structlog.get_logger(__name__)


def _handle_exc(exc: Exception, operation: str, session_id: str) -> None:
    """Convert exceptions to appropriate HTTP errors with clean messages."""
    msg = str(exc)
    log.error(f"{operation}.error", session_id=session_id, error=msg)
    # ValueError = user/config error → 400; everything else → 500
    status = 400 if isinstance(exc, ValueError) else 500
    raise HTTPException(status_code=status, detail=msg)


@router.post("/analytics/insights", response_model=InsightsResponse, summary="Generate business insights")
async def get_insights(request: AnalyticsRequest, user: User = Depends(get_current_user)):
    """
    Generate AI-powered business insights for the uploaded dataset.
    Returns 5-8 insight cards with titles, descriptions, severity, and category.
    """
    session = session_manager.get_session(request.session_id, user)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session '{request.session_id}' not found.")
    if not session.files:
        raise HTTPException(status_code=400, detail="No files in session.")

    try:
        return await analytics_service.generate_insights(session, request.filename)
    except Exception as exc:
        _handle_exc(exc, "insights", request.session_id)


@router.post("/analytics/anomalies", response_model=AnomalyResponse, summary="Detect anomalies")
async def detect_anomalies(request: AnalyticsRequest, user: User = Depends(get_current_user)):
    """
    Detect anomalous rows using Isolation Forest on numeric columns.
    Each anomaly is explained by the LLM with specific reasoning.
    """
    session = session_manager.get_session(request.session_id, user)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session '{request.session_id}' not found.")
    if not session.files:
        raise HTTPException(status_code=400, detail="No files in session.")

    try:
        return await analytics_service.detect_anomalies(session, request.filename)
    except Exception as exc:
        _handle_exc(exc, "anomalies", request.session_id)


@router.post("/analytics/chart", response_model=ChartSpec, summary="Generate a chart")
async def generate_chart(request: ChartRequest, user: User = Depends(get_current_user)):
    """
    Generate a chart specification from a natural language query.
    Returns a Recharts-compatible chart spec with real data computed from the CSV.
    """
    session = session_manager.get_session(request.session_id, user)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session '{request.session_id}' not found.")
    if not session.files:
        raise HTTPException(status_code=400, detail="No files in session.")

    try:
        return await analytics_service.generate_chart(session, request.query, request.filename)
    except Exception as exc:
        _handle_exc(exc, "chart", request.session_id)


@router.post("/analytics/dashboard", response_model=DashboardResponse, summary="Generate default dashboard")
async def generate_dashboard(request: AnalyticsRequest, user: User = Depends(get_current_user)):
    """
    Generate an automated default dashboard consisting of 5-6 data visualizations.
    """
    session = session_manager.get_session(request.session_id, user)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session '{request.session_id}' not found.")
    if not session.files:
        raise HTTPException(status_code=400, detail="No files in session.")

    try:
        charts = await analytics_service.generate_dashboard(session, request.filename, request.prompt)
        return DashboardResponse(charts=charts)
    except Exception as exc:
        _handle_exc(exc, "dashboard", request.session_id)



@router.post("/analytics/quality", response_model=DataQualityResponse, summary="Data quality check")
async def check_quality(request: AnalyticsRequest, user: User = Depends(get_current_user)):
    """
    Run comprehensive data quality checks:
    - Missing value analysis
    - Duplicate rows
    - Outlier detection (IQR method)
    - Constant/high-cardinality columns
    Returns a quality score (0-100) and prioritized issue list.
    """
    session = session_manager.get_session(request.session_id, user)
    if not session:
        raise HTTPException(status_code=404, detail=f"Session '{request.session_id}' not found.")
    if not session.files:
        raise HTTPException(status_code=400, detail="No files in session.")

    try:
        return await analytics_service.check_data_quality(session, request.filename)
    except Exception as exc:
        _handle_exc(exc, "quality", request.session_id)
