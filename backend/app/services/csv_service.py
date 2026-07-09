"""CSV upload, validation, and profiling service."""
import io
import math
from typing import Any, Dict, List

import numpy as np
import pandas as pd
import structlog

from app.core.config import settings
from app.core.session_manager import FileRecord
from app.models.schemas import ColumnInfo, FileProfile

log = structlog.get_logger(__name__)

_MAX_BYTES = settings.max_file_size_mb * 1024 * 1024


# ── Public API ────────────────────────────────────────────────


def validate_and_parse(filename: str, content: bytes) -> pd.DataFrame:
    """
    Validate a CSV file and return a parsed DataFrame.
    Raises ValueError with a user-friendly message on failure.
    """
    if not filename.lower().endswith(".csv"):
        raise ValueError(f"'{filename}' is not a CSV file.")
    if len(content) > _MAX_BYTES:
        raise ValueError(
            f"File exceeds the {settings.max_file_size_mb} MB limit "
            f"({len(content) / 1024 / 1024:.1f} MB)."
        )
    if len(content) == 0:
        raise ValueError("File is empty.")

    try:
        df = pd.read_csv(io.BytesIO(content), low_memory=False)
    except Exception as exc:
        raise ValueError(f"Could not parse CSV: {exc}") from exc

    if df.empty:
        raise ValueError("CSV parsed successfully but contains no data rows.")
    if len(df.columns) == 0:
        raise ValueError("CSV contains no columns.")

    log.info("csv.parsed", filename=filename, rows=len(df), cols=len(df.columns))
    return df


def profile_dataframe(df: pd.DataFrame, filename: str) -> FileProfile:
    """Compute a full statistical profile for a DataFrame."""
    cols_info: List[ColumnInfo] = []
    for col in df.columns:
        series = df[col]
        null_count = int(series.isna().sum())
        unique_count = int(series.nunique())
        sample_vals = _safe_sample_values(series)
        stats = _numeric_stats(series) if pd.api.types.is_numeric_dtype(series) else None

        cols_info.append(
            ColumnInfo(
                name=col,
                dtype=str(series.dtype),
                null_count=null_count,
                null_percent=round(null_count / max(len(df), 1) * 100, 2),
                unique_count=unique_count,
                sample_values=sample_vals,
                stats=stats,
            )
        )

    sample_rows = (
        df.head(settings.max_rows_preview)
        .where(pd.notna(df.head(settings.max_rows_preview)), None)
        .to_dict(orient="records")
    )

    return FileProfile(
        filename=filename,
        rows=len(df),
        columns=len(df.columns),
        columns_info=cols_info,
        sample_data=sample_rows,
        dtypes={col: str(df[col].dtype) for col in df.columns},
        duplicate_rows=int(df.duplicated().sum()),
        memory_usage_kb=round(df.memory_usage(deep=True).sum() / 1024, 2),
    )


def build_schema_summary(df: pd.DataFrame, filename: str) -> str:
    """
    Build a compact, human-readable schema string for LLM context injection.
    """
    lines = [f"### Dataset: {filename}  ({len(df):,} rows × {len(df.columns)} columns)"]
    lines.append("")
    lines.append("| Column | Type | Nulls | Unique | Sample values |")
    lines.append("|--------|------|-------|--------|---------------|")

    for col in df.columns:
        series = df[col]
        null_pct = series.isna().mean() * 100
        unique = series.nunique()
        samples = ", ".join(str(v) for v in series.dropna().head(3).tolist())
        lines.append(
            f"| {col} | {series.dtype} | {null_pct:.0f}% | {unique} | {samples} |"
        )

    # Numeric stats
    numeric_cols = df.select_dtypes(include="number").columns.tolist()
    if numeric_cols:
        lines.append("")
        lines.append("**Numeric summary:**")
        stats = df[numeric_cols].describe().round(2)
        lines.append(stats.to_string())

    # First N rows
    lines.append("")
    lines.append(f"**First {settings.max_rows_preview} rows:**")
    lines.append(
        df.head(settings.max_rows_preview)
        .fillna("NULL")
        .to_markdown(index=False)
    )
    return "\n".join(lines)


def build_file_record(filename: str, df: pd.DataFrame) -> FileRecord:
    """Create a FileRecord combining the DataFrame and its profile/schema."""
    profile = profile_dataframe(df, filename)
    schema_summary = build_schema_summary(df, filename)
    return FileRecord(
        filename=filename,
        df=df,
        schema_summary=schema_summary,
        profile=profile.model_dump(),
    )


# ── Private Helpers ───────────────────────────────────────────


def _safe_sample_values(series: pd.Series, n: int = 5) -> List[Any]:
    vals = series.dropna().head(n).tolist()
    return [v if not (isinstance(v, float) and (math.isnan(v) or math.isinf(v))) else None for v in vals]


def _numeric_stats(series: pd.Series) -> Dict[str, Any]:
    desc = series.describe()
    return {
        k: (None if (isinstance(v, float) and (math.isnan(v) or math.isinf(v))) else round(float(v), 4))
        for k, v in desc.items()
    }
