"""Tests for chat service utilities (safe_exec, helpers)."""
import math

import numpy as np
import pandas as pd
import pytest

from app.utils.helpers import result_to_chart_data, safe_exec, serialize_result


# ── Fixtures ──────────────────────────────────────────────────

@pytest.fixture
def sample_df():
    return pd.DataFrame({
        "region": ["North", "South", "East", "West"],
        "revenue": [15000.0, 8500.0, 22000.0, 5000.0],
        "units": [120, 80, 200, 45],
    })


# ── safe_exec ─────────────────────────────────────────────────

def test_safe_exec_basic(sample_df):
    code = "result = df['revenue'].sum()"
    result, output, error = safe_exec(code, {"df": sample_df})
    assert error is None
    assert result == pytest.approx(50500.0)


def test_safe_exec_groupby(sample_df):
    code = "result = df.groupby('region')['revenue'].sum().reset_index()"
    result, output, error = safe_exec(code, {"df": sample_df})
    assert error is None
    assert isinstance(result, pd.DataFrame)
    assert "revenue" in result.columns


def test_safe_exec_captures_stdout(sample_df):
    code = "print('hello'); result = 42"
    result, output, error = safe_exec(code, {"df": sample_df})
    assert result == 42
    assert "hello" in (output or "")


def test_safe_exec_syntax_error(sample_df):
    code = "result = df['revenue"  # unclosed string
    result, output, error = safe_exec(code, {"df": sample_df})
    assert result is None
    assert error is not None


def test_safe_exec_runtime_error(sample_df):
    code = "result = df['nonexistent_column'].sum()"
    result, output, error = safe_exec(code, {"df": sample_df})
    assert result is None
    assert error is not None


def test_safe_exec_no_import():
    """Verify dangerous imports are blocked."""
    code = "import os; result = os.getcwd()"
    result, output, error = safe_exec(code, {})
    # Should fail with NameError or ImportError
    assert result is None or error is not None


def test_safe_exec_no_open():
    """Verify file open is blocked."""
    code = "result = open('secrets.txt').read()"
    result, output, error = safe_exec(code, {})
    assert result is None or error is not None


# ── serialize_result ──────────────────────────────────────────

def test_serialize_dataframe(sample_df):
    result = serialize_result(sample_df)
    assert isinstance(result, list)
    assert len(result) == 4
    assert "revenue" in result[0]


def test_serialize_series():
    s = pd.Series([1, 2, 3], name="vals")
    result = serialize_result(s)
    assert isinstance(result, list)


def test_serialize_numpy_int():
    result = serialize_result(np.int64(42))
    assert result == 42
    assert isinstance(result, int)


def test_serialize_numpy_float():
    result = serialize_result(np.float64(3.14))
    assert result == pytest.approx(3.14)


def test_serialize_nan_becomes_none():
    result = serialize_result(np.float64(float("nan")))
    assert result is None


def test_serialize_numpy_array():
    arr = np.array([1, 2, 3])
    result = serialize_result(arr)
    assert result == [1, 2, 3]


# ── result_to_chart_data ──────────────────────────────────────

def test_chart_data_from_df(sample_df):
    data = result_to_chart_data(sample_df)
    assert isinstance(data, list)
    assert len(data) == 4


def test_chart_data_from_scalar():
    data = result_to_chart_data(42)
    assert data == [{"value": 42}]


def test_chart_data_from_none():
    data = result_to_chart_data(None)
    assert data == []
