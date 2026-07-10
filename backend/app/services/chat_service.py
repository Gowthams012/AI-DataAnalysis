"""
Chat orchestration service.

Flow per request
----------------
1. Build data context (schema summaries for all session files)
2. Build conversation history (last N turns)
3. Construct LLM prompt
4. Call LLM → structured JSON response
5. Execute generated code (if any) in safe sandbox
6. Resolve chart data from code result (if chart_spec.data == "USE_CODE_RESULT")
7. Persist messages in session
8. Return rich ChatResponse
"""
import json
import textwrap
from typing import Dict, List, Optional

import pandas as pd
import logging

from app.core.config import settings
from app.core.llm_client import llm_client
from app.core.session_manager import Session, session_manager
from app.models.schemas import ChatResponse, ChartSpec, CodeBlock, YKey
from app.utils.helpers import result_to_chart_data, safe_exec, serialize_result

log = logging.getLogger(__name__)

# ── Prompt templates ──────────────────────────────────────────

_SYSTEM_PROMPT = textwrap.dedent("""
You are an expert AI Data Analyst. You help users understand their data through clear,
accurate analysis. You always explain your reasoning and generate working code. 
Explain your findings using easy, normal language that a non-technical person can understand. Avoid overly complex jargon in your answer.

## Response Format
You MUST respond with a single valid JSON object — no markdown outside the JSON block.
Use this exact schema:

```json
{
  "answer": "<markdown-formatted answer>",
  "reasoning": "<step-by-step explanation of how you derived the answer>",
  "code": {
    "language": "<python|sql|>",
    "snippet": "<code to execute, assign final answer to variable named 'result'>"
  },
  "chart_spec": {
    "type": "<bar|line|pie|scatter|area|bubble|map|boxplot>",
    "title": "<descriptive chart title>",
    "data": "USE_CODE_RESULT",
    "xKey": "<column for x-axis (or location name for maps, or category for boxplots)>",
    "yKeys": [{"key": "<col>", "color": "#6366f1", "name": "<label>"}],
    "xLabel": "<x-axis label>",
    "yLabel": "<y-axis label>",
    "zKey": "<for bubble: column with size values>",
    "locationMode": "<for map: 'country names', 'ISO-3', or 'USA-states'>"
  },
  "sql": "<SQL equivalent query, or empty string>",
  "follow_up_questions": ["<question 1>", "<question 2>", "<question 3>"]
}
```

## Rules
- If the requested answer is just a single number, text, or a simple summary, you MUST set `chart_spec` to `null`. ONLY generate a `chart_spec` if the result contains multiple data points suitable for a chart.
- CRITICAL: If the user explicitly asks for a chart, plot, graph, or visualization, you MUST provide a valid `chart_spec` object and MUST NOT set it to null. You must also write the corresponding python code to generate the data for the chart.
- If no code is needed, set `code.snippet` to `""`.
- When generating Python code, ALWAYS assign the final answer/data to a variable named `result`.
- The `code.snippet` field MUST ALWAYS be valid Python pandas code. NEVER put SQL in `code.snippet`. If the user asks for SQL, put the SQL in the `sql` field, but you MUST STILL provide the equivalent Python pandas code in `code.snippet` so we can execute it to get the results.
- The dataframes are ALREADY loaded in memory. DO NOT use pd.read_csv() or try to read files from disk. Just use the `df` variable directly.
- You can ONLY use pandas (pd), numpy (np), math, and scipy.stats (stats). DO NOT use scikit-learn or any other library. DO NOT generate ANY import statements.
- For pie charts, use `nameKey` and `valueKey` instead of `xKey`/`yKeys`.
- Chart `data` should always be `"USE_CODE_RESULT"` — the backend will run the code and substitute real data.
- Prefer pandas code over SQL when possible. Include SQL as a bonus when relevant.
- Available DataFrame variables: {df_vars}
""").strip()


# ── Public API ────────────────────────────────────────────────


async def chat(session_id: str, message: str) -> ChatResponse:
    """Process a user message and return a structured AI response."""
    session = session_manager.get_session(session_id)
    if not session:
        raise ValueError(f"Session '{session_id}' not found.")
    if not session.files:
        raise ValueError("No files uploaded yet. Please upload a CSV file first.")

    # 1. Build context
    data_context = _build_data_context(session)
    df_vars = _build_df_namespace(session)

    # 2. Build conversation history
    history_text = _build_history(session)

    # 3. Construct prompt
    system_prompt = _SYSTEM_PROMPT.replace("{df_vars}", ", ".join(df_vars.keys()))
    user_prompt = textwrap.dedent(f"""
## Available Data
{data_context}

## Conversation History
{history_text}

## Current Question
{message}
""").strip()

    # 4. Call LLM
    raw = await llm_client.generate(user_prompt, system_prompt=system_prompt)
    parsed = llm_client.parse_json_response(raw)

    # 5. Build response parts
    answer = parsed.get("answer", raw)
    reasoning = parsed.get("reasoning", "")
    sql = parsed.get("sql", "") or ""
    follow_up = parsed.get("follow_up_questions", [])

    code_block: Optional[CodeBlock] = None
    code_data = parsed.get("code") or {}
    if code_data.get("snippet"):
        code_block = CodeBlock(
            language=code_data.get("language", "python"),
            snippet=code_data["snippet"],
        )

    chart_spec_obj: Optional[ChartSpec] = None
    exec_output: Optional[str] = None
    exec_error: Optional[str] = None

    # 6. Execute code
    exec_result = None
    if code_block and code_block.snippet:
        exec_result, exec_output, exec_error = safe_exec(code_block.snippet, df_vars)
        if exec_result is not None:
            exec_result = serialize_result(exec_result)
            # If there was no printed output, show the result variable so it appears in the Queries page
            if not exec_output:
                try:
                    exec_output = json.dumps(exec_result, indent=2, default=str)
                except Exception:
                    exec_output = str(exec_result)
                    
        log.info(
            "chat.code_exec - session_id=%s, has_result=%s, error=%s",
            session_id,
            exec_result is not None,
            exec_error,
        )

    # 7. Build chart spec
    chart_data = parsed.get("chart_spec")
    if chart_data:
        # Resolve data
        raw_data = chart_data.get("data", [])
        if raw_data == "USE_CODE_RESULT" and exec_result is not None:
            resolved_data = result_to_chart_data(exec_result)
        elif isinstance(raw_data, list):
            resolved_data = raw_data
        else:
            resolved_data = []

        y_keys_raw = chart_data.get("yKeys", [])
        chart_colors = ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"]
        y_keys = [
            YKey(
                key=yk.get("key", ""),
                color=yk.get("color", chart_colors[i % len(chart_colors)]),
                name=yk.get("name", yk.get("key", "")),
            )
            for i, yk in enumerate(y_keys_raw)
        ]

        chart_spec_obj = ChartSpec(
            type=chart_data.get("type", "bar"),
            title=chart_data.get("title", "Chart"),
            data=resolved_data,
            xKey=chart_data.get("xKey", ""),
            yKeys=y_keys,
            xLabel=chart_data.get("xLabel"),
            yLabel=chart_data.get("yLabel"),
            nameKey=chart_data.get("nameKey"),
            valueKey=chart_data.get("valueKey"),
            zKey=chart_data.get("zKey"),
            locationMode=chart_data.get("locationMode"),
        )

    # 8. Persist conversation
    session_manager.add_message(session_id, "user", message)
    session_manager.add_message(session_id, "assistant", answer)

    return ChatResponse(
        answer=answer,
        reasoning=reasoning,
        code=code_block,
        chart_spec=chart_spec_obj,
        sql=sql or None,
        follow_up_questions=follow_up,
        execution_output=exec_output,
        execution_error=exec_error,
    )


# ── Private Helpers ───────────────────────────────────────────


def _build_data_context(session: Session) -> str:
    parts = []
    for fname, record in session.files.items():
        parts.append(record.schema_summary)
    return "\n\n---\n\n".join(parts)


def _build_df_namespace(session: Session, selected_filename: Optional[str] = None) -> Dict[str, pd.DataFrame]:
    """Create the variable namespace for code execution."""
    ns: Dict[str, pd.DataFrame] = {}
    
    # Prioritize selected_filename to be mapped to 'df'
    primary_filename = selected_filename
    if not primary_filename and session.files:
        primary_filename = next(iter(session.files.keys()))
        
    for i, (fname, rec) in enumerate(session.files.items()):
        # Add sanitized filename as variable name
        safe_name = rec.filename.replace(".csv", "").replace("-", "_").replace(" ", "_").lower()
        ns[safe_name] = rec.df
        
        if fname == primary_filename:
            ns["df"] = rec.df
        else:
            var_name = f"df_{i+1}"
            if "df" not in ns and var_name == "df_1":
                # Just in case, though handled above
                var_name = f"df_{i+2}"
            ns[var_name] = rec.df
            
    return ns


def _build_history(session: Session) -> str:
    msgs = session.conversation[-(settings.max_conversation_history * 2):]
    if not msgs:
        return "(No previous conversation)"
    lines = []
    for m in msgs:
        role = "User" if m.role == "user" else "Assistant"
        # Truncate very long assistant messages to keep prompt manageable
        content = m.content[:800] + "…" if len(m.content) > 800 else m.content
        lines.append(f"**{role}:** {content}")
    return "\n\n".join(lines)
