# AI Data Analyst 🤖📊

An AI-powered data analysis platform. Upload CSV files and interact with your data using natural language — get insights, visualizations, anomaly detection, and SQL/Pandas code generation powered by an LLM.

---

## Features

| Feature | Details |
|---|---|
| **CSV Upload** | Drag-and-drop, multiple files, up to 50 MB each |
| **Natural Language Q&A** | Ask questions in plain English, get answers with reasoning |
| **Code Generation** | Pandas + SQL generated automatically |
| **Code Execution** | Code runs in a safe sandbox — real computed results |
| **Charts** | Bar, Line, Area, Pie, Scatter — rendered with Recharts |
| **Anomaly Detection** | Isolation Forest + LLM explanation per flagged row |
| **AI Insights** | 5-8 business insights with severity & category |
| **Data Quality** | Missing values, duplicates, outliers, score 0–100 |
| **Conversation Memory** | Last N turns kept in LLM context |
| **Export Report** | Download full session as JSON |
| **Multi-file Analysis** | Multiple CSVs per session |
| **Session Management** | UUID sessions, file removal, session reset |

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Google Gemini API key ([get one free](https://aistudio.google.com/app/apikey))

### 1. Backend

```bash
cd backend

# Create virtual environment
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env

# Edit .env and set your credentials:
# 1. Set GEMINI_API_KEY=your-key-here
# 2. Set Supabase variables (DATABASE_URL, SUPABASE_URL, SUPABASE_KEY, JWT_SECRET)
# Note: The application uses Supabase PostgreSQL with the pgvector extension.

# Run server
python main.py
# → http://localhost:8000
# → Swagger docs at http://localhost:8000/docs
```

### 2. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
copy .env.example .env   # uses http://localhost:8000 by default

# Run dev server
npm run dev
# → http://localhost:5173
```

### 3. Run Tests

```bash
cd backend
pytest tests/ -v
```

---

## Project Structure

```
dbo/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py          ← pydantic-settings
│   │   │   ├── llm_client.py      ← Gemini/OpenAI abstraction
│   │   │   └── session_manager.py ← Thread-safe in-memory sessions
│   │   ├── models/
│   │   │   └── schemas.py         ← All Pydantic models
│   │   ├── services/
│   │   │   ├── csv_service.py     ← Upload, validate, profile
│   │   │   ├── chat_service.py    ← LLM orchestration + code exec
│   │   │   └── analytics_service.py ← Insights, anomalies, charts, quality
│   │   ├── api/v1/endpoints/
│   │   │   ├── upload.py          ← POST /upload
│   │   │   ├── chat.py            ← POST /chat, GET+DELETE /chat/history
│   │   │   ├── analytics.py       ← POST /analytics/*
│   │   │   └── sessions.py        ← GET/DELETE /sessions, export
│   │   └── utils/
│   │       └── helpers.py         ← safe_exec, serialize_result
│   ├── tests/
│   │   ├── test_csv_service.py
│   │   └── test_chat_service.py
│   ├── main.py
│   └── requirements.txt
│
└── frontend/
    └── src/
        ├── types/index.ts          ← TypeScript types
        ├── store/useAppStore.ts    ← Zustand global state
        ├── services/api.ts         ← Axios API client
        ├── components/
        │   ├── FileUpload.tsx      ← Drag-and-drop upload
        │   ├── ChatInterface.tsx   ← Chat UI + message bubbles
        │   ├── ChartRenderer.tsx   ← Recharts wrapper
        │   ├── AnomalyPanel.tsx    ← Anomaly detection UI
        │   ├── InsightsPanel.tsx   ← AI insights cards
        │   ├── QualityPanel.tsx    ← Data quality score UI
        │   └── Sidebar.tsx         ← Navigation + file list
        └── pages/
            └── HomePage.tsx        ← Main app layout
```

---

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/api/v1/upload` | Upload CSV files |
| `POST` | `/api/v1/chat` | Ask a question |
| `GET` | `/api/v1/chat/history/{session_id}` | Conversation history |
| `DELETE` | `/api/v1/chat/history/{session_id}` | Clear history |
| `POST` | `/api/v1/analytics/insights` | Generate insights |
| `POST` | `/api/v1/analytics/anomalies` | Detect anomalies |
| `POST` | `/api/v1/analytics/chart` | Generate chart |
| `POST` | `/api/v1/analytics/quality` | Data quality check |
| `GET` | `/api/v1/sessions/{session_id}` | Session details |
| `DELETE` | `/api/v1/sessions/{session_id}` | Delete session |
| `GET` | `/api/v1/sessions/{session_id}/export` | Export report |

Full interactive docs: [http://localhost:8000/docs](http://localhost:8000/docs)

---

## Environment Variables

### Backend (`.env`)

```env
LLM_PROVIDER=gemini           # or openai
GEMINI_API_KEY=...            # Google AI Studio key
OPENAI_API_KEY=...            # OpenAI key (if using OpenAI)
MAX_FILE_SIZE_MB=50
MAX_FILES_PER_SESSION=10
```

### Frontend (`.env`)

```env
VITE_API_URL=http://localhost:8000
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI, Python 3.11+ |
| LLM | Google Gemini 1.5 Flash (configurable) |
| Data Processing | Pandas, NumPy |
| Anomaly Detection | scikit-learn IsolationForest |
| Frontend | React 18, TypeScript, Vite |
| State | Zustand |
| Charts | Recharts |
| Styling | Vanilla CSS (dark glassmorphism) |
| Logging | structlog |
| Testing | pytest |

---

## Example Questions

```
Which region generated the highest revenue?
Show monthly sales trends as a line chart.
Which products are underperforming?
What are the top five customers by order value?
Generate SQL for a revenue by category analysis.
Detect anomalies in the dataset.
What is the correlation between price and quantity sold?
Show me a pie chart of sales by category.
```
