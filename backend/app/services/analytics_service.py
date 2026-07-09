"""
Analytics service — insights, anomaly detection, chart generation, data quality.
"""
import json
import math
import textwrap
from typing import Dict, List, Optional

import numpy as np
import pandas as pd
import structlog  # type: ignore
from sklearn.ensemble import IsolationForest

from app.core.config import settings
from app.core.llm_client import llm_client
from app.core.session_manager import Session
from app.models.schemas import (
    AnomalyItem,
    AnomalyResponse,
    ChartSpec,
    DataQualityResponse,
    InsightItem,
    InsightsResponse,
    QualityIssue,
    YKey,
)

log = structlog.get_logger(__name__)

_CHART_COLORS = ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899"]


# ── Insights ──────────────────────────────────────────────────


async def generate_insights(session: Session, filename: Optional[str] = None) -> InsightsResponse:
    """Generate business insights for a dataset using the LLM."""
    df, fname = _resolve_df(session, filename)

    stats_summary = _build_stats_summary(df, fname)

    prompt = textwrap.dedent(f"""
You are an expert data analyst. Analyze the following dataset statistics and generate actionable business insights.

{stats_summary}

Respond ONLY with valid JSON matching this schema:
{{
  "insights": [
    {{
      "title": "<short insight title>",
      "description": "<detailed explanation with specific numbers from the data>",
      "severity": "<high|medium|low>",
      "category": "<trend|outlier|pattern|correlation|summary>"
    }}
  ],
  "summary": "<2-3 sentence executive summary of the dataset>"
}}

Generate between 5 and 8 insights. Focus on actionable findings.
""").strip()

    raw = await llm_client.generate(prompt)
    parsed = llm_client.parse_json_response(raw)

    insights = [
        InsightItem(
            title=i.get("title", "Insight"),
            description=i.get("description", ""),
            severity=i.get("severity", "medium"),
            category=i.get("category", "summary"),
        )
        for i in parsed.get("insights", [])
    ]

    return InsightsResponse(
        insights=insights,
        summary=parsed.get("summary", "Analysis complete."),
    )


# ── Anomaly Detection ─────────────────────────────────────────


async def detect_anomalies(
    session: Session,
    filename: Optional[str] = None,
    contamination: float = 0.05,
    max_anomalies: int = 20,
) -> AnomalyResponse:
    """
    Detect anomalies using Isolation Forest on numeric columns,
    then ask the LLM to explain each flagged row.
    """
    df, fname = _resolve_df(session, filename)

    numeric_cols = df.select_dtypes(include="number").columns.tolist()
    if not numeric_cols:
        return AnomalyResponse(
            anomalies=[],
            total_anomalies=0,
            anomaly_percentage=0.0,
            summary="No numeric columns found — anomaly detection requires numeric data.",
            method="Isolation Forest",
            columns_used=[],
        )

    # Run IsolationForest
    df_numeric = df[numeric_cols].fillna(df[numeric_cols].median())
    iso = IsolationForest(contamination=contamination, random_state=42, n_estimators=100)
    predictions = iso.fit_predict(df_numeric)        # -1 = anomaly, 1 = normal
    scores = iso.score_samples(df_numeric)           # more negative = more anomalous

    anomaly_mask = predictions == -1
    anomaly_indices = df.index[anomaly_mask].tolist()
    total_anomalies = len(anomaly_indices)
    anomaly_pct = round(total_anomalies / max(len(df), 1) * 100, 2)

    log.info(
        "anomaly.detected",
        filename=fname,
        total=total_anomalies,
        pct=anomaly_pct,
        cols=numeric_cols,
    )

    # Take top N most anomalous rows
    anomaly_scores_map = {idx: scores[i] for i, idx in enumerate(df.index) if anomaly_mask[i]}
    top_indices = sorted(anomaly_scores_map, key=lambda x: anomaly_scores_map[x])[:max_anomalies]

    # Ask LLM to explain them
    anomaly_rows_text = _format_anomaly_rows(df, top_indices, numeric_cols)
    stats_text = df[numeric_cols].describe().round(2).to_string()

    explanation_prompt = textwrap.dedent(f"""
You are an expert data analyst. Isolation Forest flagged the following rows as anomalies.

Dataset numeric statistics (for reference):
{stats_text}

Flagged anomalous rows (format: Row <index>: <values>):
{anomaly_rows_text}

For EACH flagged row above, explain specifically WHY it is anomalous by comparing its values to the typical ranges.
Provide a brief, easy-to-understand reason formatted with bullet points.

Respond ONLY with valid JSON matching this exact structure:
{{
  "explanations": [
    {{
      "row_index": 123, 
      "explanation": "- Value X is significantly higher than the median.\n- Value Z is unusually low."
    }}
  ],
  "summary": "<overall summary of anomaly patterns found>"
}}
IMPORTANT: 
- `row_index` MUST be the exact integer matching the row number provided.
- `explanation` MUST be a markdown string using bullet points (`-`).
""").strip()

    raw = await llm_client.generate(explanation_prompt)
    parsed = llm_client.parse_json_response(raw)

    explanation_map: Dict[int, str] = {}
    for e in parsed.get("explanations", []):
        if "row_index" in e:
            try:
                r_idx = int(e["row_index"])
                explanation_map[r_idx] = e.get("explanation", "Unusual combination of feature values.")
            except (ValueError, TypeError):
                pass

    anomaly_items: List[AnomalyItem] = []
    for idx in top_indices:
        row_data = df.loc[idx].where(pd.notna(df.loc[idx]), None).to_dict()
        row_data = {k: (None if isinstance(v, float) and math.isnan(v) else v) for k, v in row_data.items()}
        anomaly_items.append(
            AnomalyItem(
                row_index=int(idx),
                row_data=row_data,
                anomaly_score=round(float(anomaly_scores_map[idx]), 4),
                explanation=explanation_map.get(int(idx), "Unusual combination of feature values."),
            )
        )

    return AnomalyResponse(
        anomalies=anomaly_items,
        total_anomalies=total_anomalies,
        anomaly_percentage=anomaly_pct,
        summary=parsed.get("summary", f"Detected {total_anomalies} anomalies ({anomaly_pct}% of rows)."),
        method="Isolation Forest",
        columns_used=numeric_cols,
    )


# ── Chart Generation ──────────────────────────────────────────


async def generate_chart(session: Session, query: str, filename: Optional[str] = None) -> ChartSpec:
    """
    Generate a chart specification from a natural language query.
    The LLM picks chart type, axes, and produces pandas code;
    we execute the code to get real data.
    """
    from app.services.chat_service import _build_df_namespace
    from app.utils.helpers import result_to_chart_data, safe_exec, serialize_result

    df, fname = _resolve_df(session, filename)
    df_vars = _build_df_namespace(session)

    schema_summary = session.files[fname].schema_summary

    prompt = textwrap.dedent(f"""
You are a data analyst creating a chart. The user wants: "{query}"

Dataset schema:
{schema_summary}

Available DataFrame variable: df (and {", ".join(df_vars.keys())})

Generate a chart specification. Respond ONLY with valid JSON:
{{
  "type": "<bar|line|pie|scatter|area>",
  "title": "<descriptive title>",
  "code": "<pandas code that assigns a DataFrame or Series to 'result'>",
  "xKey": "<column for x-axis (leave empty for pie)>",
  "yKeys": [{{"key": "<col>", "color": "{_CHART_COLORS[0]}", "name": "<label>"}}],
  "xLabel": "<x-axis label>",
  "yLabel": "<y-axis label>",
  "nameKey": "<for pie: column with category names>",
  "valueKey": "<for pie: column with values>"
}}
""").strip()

    raw = await llm_client.generate(prompt)
    parsed = llm_client.parse_json_response(raw)

    # Execute the generated code
    code = parsed.get("code", "")
    resolved_data = []
    if code:
        exec_result, _, exec_error = safe_exec(code, df_vars)
        if exec_result is not None:
            resolved_data = result_to_chart_data(serialize_result(exec_result))
        if exec_error:
            log.warning("chart.code_exec.error", error=exec_error)

    y_keys_raw = parsed.get("yKeys", [])
    y_keys = [
        YKey(
            key=yk.get("key", ""),
            color=yk.get("color", _CHART_COLORS[i % len(_CHART_COLORS)]),
            name=yk.get("name", yk.get("key", "")),
        )
        for i, yk in enumerate(y_keys_raw)
    ]

    return ChartSpec(
        type=parsed.get("type", "bar"),
        title=parsed.get("title", query),
        data=resolved_data,
        xKey=parsed.get("xKey", ""),
        yKeys=y_keys,
        xLabel=parsed.get("xLabel"),
        yLabel=parsed.get("yLabel"),
        nameKey=parsed.get("nameKey"),
        valueKey=parsed.get("valueKey"),
    )


async def generate_dashboard(session: Session, filename: Optional[str] = None) -> List[ChartSpec]:
    """Generate a full automated dashboard (5-6 charts) based on dataset patterns."""
    from app.services.chat_service import _build_df_namespace
    from app.utils.helpers import result_to_chart_data, safe_exec, serialize_result

    df, fname = _resolve_df(session, filename)
    df_vars = _build_df_namespace(session)
    schema_summary = session.files[fname].schema_summary
    stats_summary = _build_stats_summary(df, fname)

    prompt = textwrap.dedent(f"""
You are an expert data analyst. Generate an insightful dashboard containing 5 to 6 different visualizations based on the dataset patterns.

Dataset schema:
{schema_summary}

Dataset statistics:
{stats_summary}

Available DataFrame variable: df (and {", ".join(df_vars.keys())})

Generate 5-6 diverse chart specifications (e.g. some bars, lines, pies, scatters) that tell a story about this data.
Respond ONLY with valid JSON matching this exact structure:
{{
  "charts": [
    {{
      "type": "<bar|line|pie|scatter|area>",
      "title": "<descriptive title>",
      "code": "<pandas code that assigns a DataFrame or Series to 'result'>",
      "xKey": "<column for x-axis (leave empty for pie)>",
      "yKeys": [{{"key": "<col>", "color": "{_CHART_COLORS[0]}", "name": "<label>"}}],
      "xLabel": "<x-axis label>",
      "yLabel": "<y-axis label>",
      "nameKey": "<for pie: column with category names>",
      "valueKey": "<for pie: column with values>"
    }}
  ]
}}
""").strip()

    raw = await llm_client.generate(prompt)
    parsed = llm_client.parse_json_response(raw)
    charts_raw = parsed.get("charts", [])
    
    valid_charts = []
    for c in charts_raw:
        code = c.get("code", "")
        resolved_data = []
        if code:
            exec_result, _, exec_error = safe_exec(code, df_vars)
            if exec_result is not None:
                resolved_data = result_to_chart_data(serialize_result(exec_result))
            if exec_error:
                log.warning("dashboard.chart.exec.error", error=exec_error, title=c.get("title"))
                continue # Skip chart if it failed to execute
        
        y_keys_raw = c.get("yKeys", [])
        y_keys = [
            YKey(
                key=yk.get("key", ""),
                color=yk.get("color", _CHART_COLORS[i % len(_CHART_COLORS)]),
                name=yk.get("name", yk.get("key", "")),
            )
            for i, yk in enumerate(y_keys_raw)
        ]

        if resolved_data:
            valid_charts.append(
                ChartSpec(
                    type=c.get("type", "bar"),
                    title=c.get("title", "Chart"),
                    data=resolved_data,
                    xKey=c.get("xKey", ""),
                    yKeys=y_keys,
                    xLabel=c.get("xLabel"),
                    yLabel=c.get("yLabel"),
                    nameKey=c.get("nameKey"),
                    valueKey=c.get("valueKey"),
                )
            )

    return valid_charts



# ── Data Quality ──────────────────────────────────────────────


async def check_data_quality(session: Session, filename: Optional[str] = None) -> DataQualityResponse:
    """Run deterministic quality checks and ask LLM to prioritize and explain."""
    df, fname = _resolve_df(session, filename)
    issues: List[QualityIssue] = []

    # 1. Missing values
    for col in df.columns:
        null_pct = df[col].isna().mean() * 100
        if null_pct > 50:
            issues.append(QualityIssue(
                column=col, issue_type="missing_values", severity="high",
                description=f"{null_pct:.1f}% of values are missing.",
                affected_rows=int(df[col].isna().sum()),
                recommendation=f"Consider dropping column '{col}' or imputing with mean/median/mode.",
            ))
        elif null_pct > 10:
            issues.append(QualityIssue(
                column=col, issue_type="missing_values", severity="medium",
                description=f"{null_pct:.1f}% of values are missing.",
                affected_rows=int(df[col].isna().sum()),
                recommendation=f"Impute missing values in '{col}' using an appropriate strategy.",
            ))

    # 2. Duplicate rows
    dup_count = int(df.duplicated().sum())
    if dup_count > 0:
        issues.append(QualityIssue(
            column=None, issue_type="duplicate_rows", severity="high" if dup_count > len(df) * 0.05 else "medium",
            description=f"{dup_count} duplicate rows found ({dup_count / len(df) * 100:.1f}%).",
            affected_rows=dup_count,
            recommendation="Remove duplicate rows with df.drop_duplicates().",
        ))

    # 3. Outliers (IQR method) for numeric columns
    for col in df.select_dtypes(include="number").columns:
        q1 = df[col].quantile(0.25)
        q3 = df[col].quantile(0.75)
        iqr = q3 - q1
        if iqr == 0:
            continue
        outliers = df[(df[col] < q1 - 3 * iqr) | (df[col] > q3 + 3 * iqr)]
        if len(outliers) > 0:
            issues.append(QualityIssue(
                column=col, issue_type="outliers", severity="low",
                description=f"{len(outliers)} extreme outliers detected (beyond 3×IQR).",
                affected_rows=len(outliers),
                recommendation=f"Investigate outliers in '{col}' — may indicate data entry errors.",
            ))

    # 4. Constant columns
    for col in df.columns:
        if df[col].nunique() == 1:
            issues.append(QualityIssue(
                column=col, issue_type="constant_column", severity="medium",
                description=f"Column '{col}' has only one unique value.",
                affected_rows=len(df),
                recommendation=f"Column '{col}' provides no analytical value — consider dropping it.",
            ))

    # 5. High cardinality text columns
    for col in df.select_dtypes(include="object").columns:
        if df[col].nunique() / max(len(df), 1) > 0.95 and len(df) > 100:
            issues.append(QualityIssue(
                column=col, issue_type="high_cardinality", severity="low",
                description=f"Column '{col}' has {df[col].nunique()} unique values (nearly unique per row).",
                affected_rows=len(df),
                recommendation=f"'{col}' may be an ID column; consider excluding from aggregations.",
            ))

    # Calculate quality score
    penalty = sum({"high": 20, "medium": 8, "low": 3}.get(i.severity, 0) for i in issues)
    score = max(0.0, round(100.0 - penalty, 1))

    # LLM summary
    issues_text = "\n".join(
        f"- [{i.severity.upper()}] {i.issue_type} on '{i.column}': {i.description}"
        for i in issues
    ) or "No issues found."

    summary_prompt = textwrap.dedent(f"""
Dataset '{fname}' has {len(df)} rows and {len(df.columns)} columns.
Data quality score: {score}/100

Issues detected:
{issues_text}

Write a 2-3 sentence executive summary of the data quality, prioritizing the most critical issues.
Respond with just the summary text (no JSON needed).
""").strip()

    summary = await llm_client.generate(summary_prompt)
    # Strip quotes if LLM wrapped in JSON
    summary = summary.strip().strip('"')

    return DataQualityResponse(
        issues=issues,
        quality_score=score,
        summary=summary,
        rows_analyzed=len(df),
    )


# ── Private Helpers ───────────────────────────────────────────


def _resolve_df(session: Session, filename: Optional[str]) -> tuple:
    """Return (df, filename) — uses first file if filename not specified."""
    if not session.files:
        raise ValueError("No files in session.")
    if filename and filename in session.files:
        rec = session.files[filename]
    else:
        rec = next(iter(session.files.values()))
    return rec.df, rec.filename


def _build_stats_summary(df: pd.DataFrame, filename: str) -> str:
    lines = [f"### {filename} — {len(df):,} rows × {len(df.columns)} columns"]
    numeric = df.select_dtypes(include="number")
    if not numeric.empty:
        lines.append("\n**Numeric columns summary:**")
        lines.append(numeric.describe().round(2).to_string())

        # Top correlations
        if len(numeric.columns) > 1:
            corr = numeric.corr().abs()
            upper = corr.where(np.triu(np.ones(corr.shape), k=1).astype(bool))
            top_corrs = (
                upper.stack()
                .sort_values(ascending=False)
                .head(5)
            )
            if not top_corrs.empty:
                lines.append("\n**Top correlations:**")
                for (c1, c2), val in top_corrs.items():
                    lines.append(f"  - {c1} ↔ {c2}: {val:.3f}")

    cat_cols = df.select_dtypes(include="object").columns.tolist()
    if cat_cols:
        lines.append("\n**Categorical columns:**")
        for col in cat_cols[:5]:
            top = df[col].value_counts().head(3)
            lines.append(f"  - {col}: {dict(top)}")

    lines.append(f"\n**Duplicate rows:** {df.duplicated().sum()}")
    lines.append(f"**Total nulls:** {df.isna().sum().sum()}")
    return "\n".join(lines)


def _format_anomaly_rows(df: pd.DataFrame, indices: list, cols: list) -> str:
    rows = []
    for idx in indices:
        row = df.loc[idx, cols].to_dict()
        row_str = ", ".join(f"{k}={v:.2f}" if isinstance(v, float) else f"{k}={v}" for k, v in row.items())
        rows.append(f"Row {idx}: {row_str}")
    return "\n".join(rows)
