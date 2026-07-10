# AI-DataAnalysis# AI Data Analyst 🤖📊

An AI-powered data analysis platform. Upload CSV files and interact with your data using natural language — get insights, visualizations, anomaly detection, and SQL/Pandas code generation powered by an LLM.

---

## Features

| Feature | Details |
|---|---|
| **CSV Upload** | Drag-and-drop, multiple files, up to 50 MB each |
| **Natural Language Q&A** | Ask questions in plain English, get answers with reasoning |
| **Code Generation** | Pandas + SQL generated automatically |
| **Code Execution** | Code runs in a safe sandbox — real computed results |
| **Charts** | Bar, Line, Area, Pie, Scatter — rendered dynamically with Plotly |
| **Anomaly Detection** | Isolation Forest + LLM explanation per flagged row |
| **AI Insights** | 5-8 business insights with severity & category |
| **Data Quality** | Missing values, duplicates, outliers, score 0–100 |
| **Conversation Memory** | Last N turns kept in LLM context |
| **Export Report** | Download full session as JSON |
| **Multi-file Analysis** | Multiple CSVs per session |
| **Session Management** | UUID sessions, file removal, session reset |

---


## Architecture Diagram (High-Level)

![Architecture image](<System Architecture.png>)

---

## Workflow Diagram

Below is the step-by-step workflow of how data moves through the AI Data Analyst platform:

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant LLM as AI Model

    U->>F: Uploads Dataset(s)
    F->>B: POST /upload
    B->>B: Validate, Parse & Profile Data
    B-->>F: Return File Schema & Stats
    
    U->>F: Asks Question ("Show sales by region")
    F->>B: POST /chat (question + session_id)
    B->>B: Inject Data Schema + Conversation History
    B->>LLM: Send Structured Prompt
    LLM-->>B: Return JSON (Answer + Python Code + Chart Specs)
    
    B->>B: Execute Python Code in Sandbox
    B->>B: Map Code Results to Chart Spec
    B-->>F: Return Answer + Visualizations
    F-->>U: Display Rich Message (Text + Chart)
```

*(You can also refer to the included for an alternative visual representation).*

![workflow image](<Work Flow.png>)

---

## Quick Start (Docker) - Recommended

The easiest way to run the application is using Docker Compose. Ensure you have Docker installed and running.

1. **Configure Environment Variables**:
   Copy the example file and add your Supabase credentials and Gemini/OpenAI API Keys.
   ```bash
   cp backend/.env.example backend/.env
   # Edit backend/.env with your credentials
   ```

2. **Run Docker Compose** from the root directory:
   ```bash
   docker compose up --build -d
   ```

3. **Access the Application**:
   - **Frontend**: http://localhost (port 80)
   - **Backend API Docs**: http://localhost:8000/docs

---

## Quick Start (Manual)

If you prefer to run the services directly on your host machine:

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
cp .env.example .env
# Edit .env and set your credentials (GEMINI_API_KEY, Supabase URL/Key, etc.)

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
cp .env.example .env   # uses http://localhost:8000 by default

# Run dev server
npm run dev
# → http://localhost:5173
```

---

## Sample Datasets

You can use the datasets located in the `Sample Datasets/` directory (such as `Hb_PPG_7-17gdl.csv`) to immediately test the platform's analytical capabilities, charts, and anomaly detection. 


## Outputs 

1.Login/signup page :

<img width="975" height="499" alt="image" src="https://github.com/user-attachments/assets/bb5b6eef-17d3-4e36-a959-ec436367881a" />

2.Home page : 

<img width="975" height="499" alt="image" src="https://github.com/user-attachments/assets/451e6afd-c8ab-4110-b603-acb32da83530" />

3. upload CSV file :

<img width="975" height="551" alt="image" src="https://github.com/user-attachments/assets/9b70f8ca-8b5e-4e9b-becb-882611d4b8fc" />

4. Analyzing Dateset : 

<img width="975" height="498" alt="image" src="https://github.com/user-attachments/assets/1d8d4154-e476-4723-a353-e9d1366fd022" />

5.Analytics and Insights

<img width="975" height="499" alt="image" src="https://github.com/user-attachments/assets/3b6a6842-851a-4e68-96bc-44aa1b0b1835" /> 

6. Dashboard : 

<img width="975" height="497" alt="image" src="https://github.com/user-attachments/assets/05552695-0b19-4d57-a577-06b645a1c210" />

7. ChatBot : 

<img width="975" height="499" alt="image" src="https://github.com/user-attachments/assets/cbdb3383-56ac-4cf2-9fc5-78788efcc891" /> 

8. Queries Generating page :

<img width="975" height="504" alt="image" src="https://github.com/user-attachments/assets/8dac28cf-4fbe-4331-92ed-39d56efb378b" />

9. Anomaly Detection Page :

<img width="975" height="499" alt="image" src="https://github.com/user-attachments/assets/a5576f67-63b5-4ffc-9200-5918155e3b62" />

10.Data Quality :

<img width="975" height="497" alt="image" src="https://github.com/user-attachments/assets/55159d4d-2634-4be4-9863-2c89f9e4261c" />

## Demo video of  project 

link : https://drive.google.com/file/d/1CFS4_dRpoYt95kJLNRDpGS24fnOvOvne/view?usp=sharing
