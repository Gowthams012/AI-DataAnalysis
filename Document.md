# AI Data Analyst - Comprehensive Project Documentation

## 1. Problem Statement
Analyzing large and complex datasets typically requires significant technical expertise, time, and proficiency in specialized tools like Python, SQL, or BI software (Tableau, PowerBI). Non-technical stakeholders often struggle to extract actionable insights, detect anomalies, or evaluate data quality independently. They are forced to rely on dedicated data teams, which creates a bottleneck in decision-making processes and slows down business agility.

## 2. Proposed Solution
The **AI Data Analyst** is an intelligent, automated web application designed to democratize data analysis. It empowers users of any technical skill level to upload raw datasets (CSVs) and instantly receive:
- **Automated Data Profiling:** Instant parsing of schemas, data types, and statistics.
- **Natural Language Data Chat:** A chatbot interface where users can ask questions in plain English. The AI writes and executes pandas code in the background to answer queries and dynamically generate charts.
- **Automated Insights:** AI-generated business insights highlighting trends, patterns, and key takeaways.
- **Machine Learning Anomaly Detection:** Integration of `Isolation Forest` models to flag statistical outliers and explain *why* they are anomalous using LLMs.
- **Data Quality Assessment:** Deterministic and AI-driven checks for missing values, duplicates, and outliers with actionable recommendations.
- **Rich Visualizations:** An automated dashboard featuring Bar, Line, Pie, Area, Scatter, Bubble, Maps, and Box Plot charts powered by `recharts` and `plotly`.

## 3. Tech Stack

### Frontend
- **Framework:** React 18 with TypeScript, powered by Vite.
- **State Management:** Zustand for global application state.
- **Routing:** React Router DOM.
- **Charting Libraries:** Recharts (core charting) and Plotly.js (advanced Box Plots, Maps, and Bubble charts).
- **Styling:** Custom Vanilla CSS utilizing a modern "Glassmorphism" aesthetic, CSS variables for theming, and modern typography (Google Fonts).
- **Markdown:** `react-markdown` and `remark-gfm` for rendering LLM outputs beautifully.

### Backend
- **Framework:** FastAPI (Python 3.10+), providing high-performance asynchronous REST endpoints.
- **Data Processing:** `pandas` and `numpy` for blazing-fast in-memory data manipulation and code execution.
- **Machine Learning:** `scikit-learn` (specifically `IsolationForest`) for unsupervised anomaly detection.
- **Server:** Uvicorn (ASGI web server).

### AI & Core Engine
- **LLM Integration:** Integrated with Large Language Models to interpret queries, write python/pandas code, and generate natural language explanations.
- **Safe Execution Sandbox:** A controlled execution environment (`exec`) inside the backend to run AI-generated pandas code on uploaded dataframes securely.

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

## 4. Workflow Diagram

![alt text](<Work Flow.png>)

## 5. System Architecture

```mermaid
architecture-beta
    group frontend(cloud)[Frontend App]
    service react(server)[React + Vite] in frontend
    service ui(server)[Zustand State] in frontend
    
    group backend(cloud)[FastAPI Backend]
    service api(server)[REST API Endpoints] in backend
    service core(database)[Dataframes in Memory] in backend
    service ml(server)[Isolation Forest ML] in backend
    
    group external(cloud)[External APIs]
    service llm(server)[Large Language Model] in external

    react:R --> L:api
    api:B --> T:core
    api:R --> L:ml
    api:T --> B:llm
```

**Architecture Breakdown:**
1. **Client Layer:** A Single Page Application (SPA) built with React. Maintains session state and handles file chunking/uploads.
2. **API Layer:** FastAPI routes that receive files, natural language queries, and dashboard requests.
3. **Execution Layer:** When the LLM generates pandas code in response to a user question, the API layer executes this code against the in-memory dataframe. 
4. **AI Layer:** Responsible for parsing human intent, understanding the dataset schema, and mapping data correctly to chart configurations (xKey, yKey, zKey, etc.).

---

## 6. APIs

### Session & Upload
- `POST /api/v1/sessions` - Create a new session.
- `POST /api/v1/upload/{session_id}` - Upload one or more CSV files. Returns schema metadata, data types, and a preview of the data.
- `GET /api/v1/sessions/{session_id}` - Retrieve details of a specific session.
- `GET /api/v1/sessions` - Retrieve all active sessions.

### Chat & Code Execution
- `POST /api/v1/chat`
  - **Payload:** `{ "session_id": "...", "message": "Show me a box plot of Age by Gender" }`
  - **Response:** Natural language answer, executed code output, and a structured `ChartSpec` JSON for the frontend to render.

### Automated Analytics
- `POST /api/v1/analytics/insights` - Analyzes data statistics to generate 5-8 actionable business insights.
- `POST /api/v1/analytics/anomalies` - Runs Isolation Forest to flag outliers, then uses the LLM to explain the anomaly and identify the likely cause.
- `POST /api/v1/analytics/quality` - Runs deterministic checks (missing values, constant columns) and LLM summarization to score the dataset out of 100.
- `POST /api/v1/analytics/dashboard` - Automatically generates a suite of 5-6 charts (bars, maps, pies) that tell a story about the dataset.

---

## 7. Setup Instructions

### Prerequisites
- Node.js (v18+)
- Python (3.10+)
- LLM API Key (e.g., Gemini, OpenAI, etc., based on configuration)

### Backend Setup
1. Open a terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   # Windows:
   .venv\Scripts\activate
   # Mac/Linux:
   source .venv/bin/activate
   ```
3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file in the `backend` directory and add your API keys:
   ```env
   # Example for Gemini
   GEMINI_API_KEY=your_api_key_here
   ```
5. Start the FastAPI server:
   ```bash
   python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

### Frontend Setup
1. Open a new terminal and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `frontend` directory (if needed to point to the backend):
   ```env
   VITE_API_URL=http://localhost:8000
   ```
4. Start the Vite development server:
   ```bash
   npm run dev
   ```
5. Open your browser and navigate to the URL provided by Vite (usually `http://localhost:5173`).
