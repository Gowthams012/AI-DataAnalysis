"""All Pydantic request/response models for the API."""
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ── Column & File Info ─────────────────────────────────────────

class ColumnInfo(BaseModel):
    name: str
    dtype: str
    null_count: int
    null_percent: float
    unique_count: int
    sample_values: List[Any]
    stats: Optional[Dict[str, Any]] = None   # numeric columns only


class FileProfile(BaseModel):
    filename: str
    rows: int
    columns: int
    columns_info: List[ColumnInfo]
    sample_data: List[Dict[str, Any]]
    dtypes: Dict[str, str]
    duplicate_rows: int
    memory_usage_kb: float


class UploadResponse(BaseModel):
    session_id: str
    files: List[FileProfile]
    message: str


# ── Chat ──────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    session_id: str
    message: str


class CodeBlock(BaseModel):
    language: str = ""    # "python" | "sql" | ""
    snippet: str = ""


class YKey(BaseModel):
    key: str
    color: str
    name: str


class ChartSpec(BaseModel):
    type: str                         # bar | line | pie | scatter | area
    title: str
    data: List[Dict[str, Any]] = []
    xKey: str = ""
    yKeys: List[YKey] = []
    xLabel: Optional[str] = None
    yLabel: Optional[str] = None
    nameKey: Optional[str] = None     # for pie charts
    valueKey: Optional[str] = None    # for pie charts


class ChatResponse(BaseModel):
    answer: str
    reasoning: str = ""
    code: Optional[CodeBlock] = None
    chart_spec: Optional[ChartSpec] = None
    sql: Optional[str] = None
    follow_up_questions: List[str] = []
    execution_output: Optional[str] = None
    execution_error: Optional[str] = None


class ConversationMessage(BaseModel):
    role: str
    content: str
    timestamp: datetime


class ConversationHistoryResponse(BaseModel):
    session_id: str
    messages: List[ConversationMessage]


# ── Analytics ─────────────────────────────────────────────────

class InsightItem(BaseModel):
    title: str
    description: str
    severity: str   # "high" | "medium" | "low"
    category: str   # "trend" | "outlier" | "pattern" | "correlation" | "summary"


class InsightsResponse(BaseModel):
    insights: List[InsightItem]
    summary: str


class AnomalyItem(BaseModel):
    row_index: int
    row_data: Dict[str, Any]
    anomaly_score: float
    explanation: str


class AnomalyResponse(BaseModel):
    anomalies: List[AnomalyItem]
    total_anomalies: int
    anomaly_percentage: float
    summary: str
    method: str = "Isolation Forest"
    columns_used: List[str] = []


class QualityIssue(BaseModel):
    column: Optional[str] = None
    issue_type: str
    severity: str       # "high" | "medium" | "low"
    description: str
    affected_rows: int
    recommendation: str


class DataQualityResponse(BaseModel):
    issues: List[QualityIssue]
    quality_score: float    # 0-100
    summary: str
    rows_analyzed: int


class ChartRequest(BaseModel):
    session_id: str
    query: str
    filename: Optional[str] = None    # target specific file; None = first file


class AnalyticsRequest(BaseModel):
    session_id: str
    filename: Optional[str] = None


class DashboardResponse(BaseModel):
    charts: List[ChartSpec]


# ── Sessions ──────────────────────────────────────────────────

class SessionInfo(BaseModel):
    session_id: str
    file_count: int
    message_count: int
    created_at: str
    last_active: str
    files: List[str] = []


class SessionDetailResponse(BaseModel):
    session_id: str
    files: List[FileProfile]
    message_count: int
    created_at: str
    last_active: str


class DeleteFileResponse(BaseModel):
    success: bool
    message: str
