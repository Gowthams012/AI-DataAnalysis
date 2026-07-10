"""Tests for CSV service."""
import io
import pytest
import pandas as pd

from app.services import csv_service
from app.services.csv_service import (
    build_schema_summary,
    profile_dataframe,
    validate_and_parse,
)


# ── Fixtures ──────────────────────────────────────────────────

SAMPLE_CSV = b"""region,product,revenue,units
North,Widget A,15000,120
South,Widget B,8500,80
East,Widget A,22000,200
West,Widget C,5000,45
North,Widget B,18000,150
"""

EMPTY_CSV = b"col1,col2\n"


# ── validate_and_parse ────────────────────────────────────────

def test_parse_valid_csv():
    df = validate_and_parse("sales.csv", SAMPLE_CSV)
    assert isinstance(df, pd.DataFrame)
    assert len(df) == 5
    assert "revenue" in df.columns


def test_parse_rejects_non_csv():
    with pytest.raises(ValueError, match="not a CSV"):
        validate_and_parse("data.xlsx", SAMPLE_CSV)


def test_parse_rejects_empty():
    with pytest.raises(ValueError, match="empty"):
        validate_and_parse("empty.csv", b"")


def test_parse_rejects_oversized(monkeypatch):
    """Patch the module-level _MAX_BYTES so no reload side-effects."""
    monkeypatch.setattr(csv_service, "_MAX_BYTES", 0)
    with pytest.raises(ValueError, match="exceeds"):
        validate_and_parse("big.csv", SAMPLE_CSV)


def test_parse_data_only_header():
    with pytest.raises(ValueError, match="empty|no data"):
        validate_and_parse("header_only.csv", EMPTY_CSV)


# ── profile_dataframe ─────────────────────────────────────────

def test_profile_correct_shape():
    df = validate_and_parse("sales.csv", SAMPLE_CSV)
    profile = profile_dataframe(df, "sales.csv")
    assert profile.rows == 5
    assert profile.columns == 4
    assert profile.filename == "sales.csv"


def test_profile_column_names():
    df = validate_and_parse("sales.csv", SAMPLE_CSV)
    profile = profile_dataframe(df, "sales.csv")
    names = [c.name for c in profile.columns_info]
    assert "revenue" in names
    assert "region" in names


def test_profile_numeric_stats():
    df = validate_and_parse("sales.csv", SAMPLE_CSV)
    profile = profile_dataframe(df, "sales.csv")
    revenue_col = next(c for c in profile.columns_info if c.name == "revenue")
    assert revenue_col.stats is not None
    assert "mean" in revenue_col.stats


def test_profile_null_counts():
    csv_with_nulls = b"a,b\n1,\n2,3\n"
    df = pd.read_csv(io.BytesIO(csv_with_nulls))
    profile = profile_dataframe(df, "nulls.csv")
    b_col = next(c for c in profile.columns_info if c.name == "b")
    assert b_col.null_count == 1


def test_profile_duplicates():
    dup_csv = b"a,b\n1,2\n1,2\n3,4\n"
    df = pd.read_csv(io.BytesIO(dup_csv))
    profile = profile_dataframe(df, "dup.csv")
    assert profile.duplicate_rows == 1


# ── build_schema_summary ──────────────────────────────────────

def test_schema_summary_contains_filename():
    df = validate_and_parse("sales.csv", SAMPLE_CSV)
    summary = build_schema_summary(df, "sales.csv")
    assert "sales.csv" in summary


def test_schema_summary_contains_columns():
    df = validate_and_parse("sales.csv", SAMPLE_CSV)
    summary = build_schema_summary(df, "sales.csv")
    assert "revenue" in summary
    assert "region" in summary


