// ── API Types ──────────────────────────────────────────────────

export interface ColumnInfo {
  name: string;
  dtype: string;
  null_count: number;
  null_percent: number;
  unique_count: number;
  sample_values: unknown[];
  stats?: Record<string, number | null>;
}

export interface FileProfile {
  filename: string;
  rows: number;
  columns: number;
  columns_info: ColumnInfo[];
  sample_data: Record<string, unknown>[];
  dtypes: Record<string, string>;
  duplicate_rows: number;
  memory_usage_kb: number;
}

export interface UploadResponse {
  session_id: string;
  files: FileProfile[];
  message: string;
}

// ── Chat Types ─────────────────────────────────────────────────

export interface CodeBlock {
  language: string;
  snippet: string;
}

export interface YKey {
  key: string;
  color: string;
  name: string;
}

export interface ChartSpec {
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'area' | 'bubble' | 'map' | 'boxplot';
  title: string;
  data: Record<string, unknown>[];
  xKey: string;
  yKeys: YKey[];
  xLabel?: string;
  yLabel?: string;
  nameKey?: string;
  valueKey?: string;
  zKey?: string;
  locationMode?: string;
}

export interface ChatResponse {
  answer: string;
  reasoning: string;
  code?: CodeBlock;
  chart_spec?: ChartSpec;
  sql?: string;
  follow_up_questions: string[];
  execution_output?: string;
  execution_error?: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// ── Analytics Types ────────────────────────────────────────────

export interface InsightItem {
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  category: 'trend' | 'outlier' | 'pattern' | 'correlation' | 'summary';
}

export interface InsightsResponse {
  insights: InsightItem[];
  summary: string;
}

export interface AnomalyItem {
  row_index: number;
  row_data: Record<string, unknown>;
  anomaly_score: number;
  explanation: string;
}

export interface AnomalyResponse {
  anomalies: AnomalyItem[];
  total_anomalies: number;
  anomaly_percentage: number;
  summary: string;
  method: string;
  columns_used: string[];
}

export interface QualityIssue {
  column?: string;
  issue_type: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  affected_rows: number;
  recommendation: string;
}

export interface DataQualityResponse {
  issues: QualityIssue[];
  quality_score: number;
  summary: string;
  rows_analyzed: number;
}

export interface DashboardResponse {
  charts: ChartSpec[];
}

// ── UI State Types ─────────────────────────────────────────────

// ── Toast ────────────────────────────────────────────────────

export type ToastType = 'error' | 'warning' | 'success' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  createdAt: number;
}

export type MessageRole = 'user' | 'assistant';
export type PanelView = 'chat' | 'insights' | 'anomalies' | 'quality';

export interface UIMessage {
  id: string;
  role: MessageRole;
  text: string;
  reasoning?: string;
  code?: CodeBlock;
  chart_spec?: ChartSpec;
  sql?: string;
  follow_up_questions?: string[];
  execution_output?: string;
  execution_error?: string;
  timestamp: Date;
  isLoading?: boolean;
}

export interface AppState {
  // Session
  sessionId: string | null;
  setSessionId: (id: string | null) => void;
  sessionCache: Record<string, any>;
  switchSession: (newSessionId: string | null, newFiles?: FileProfile[]) => void;

  // Files
  uploadedFiles: FileProfile[];
  setUploadedFiles: (files: FileProfile[]) => void;
  addFiles: (files: FileProfile[]) => void;
  removeFile: (filename: string) => void;

  // Chat
  messages: UIMessage[];
  addMessage: (msg: UIMessage) => void;
  updateMessage: (id: string, updates: Partial<UIMessage>) => void;
  clearMessages: () => void;

  // Panel
  // activePanel removed, handled by routing

  // Analytics Data
  insights: InsightsResponse | null;
  setInsights: (data: InsightsResponse) => void;
  anomalies: AnomalyResponse | null;
  setAnomalies: (data: AnomalyResponse) => void;
  quality: DataQualityResponse | null;
  setQuality: (data: DataQualityResponse) => void;
  dashboard: ChartSpec[] | null;
  setDashboard: (data: ChartSpec[]) => void;

  // Loading
  isChatLoading: boolean;
  setIsChatLoading: (v: boolean) => void;
  isAnalyticsLoading: boolean;
  setIsAnalyticsLoading: (v: boolean) => void;

  // Toasts
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id' | 'createdAt'>) => void;
  removeToast: (id: string) => void;
}
