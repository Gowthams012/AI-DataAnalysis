import axios from 'axios';
import type {
  AnomalyResponse,
  ChatResponse,
  ChartSpec,
  DataQualityResponse,
  InsightsResponse,
  DashboardResponse,
  UploadResponse,
} from '../types';

import { supabase } from '../lib/supabase';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  timeout: 120_000, // 2 min — LLM calls can take time
});

api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

// ── Upload ─────────────────────────────────────────────────────

export async function uploadFiles(
  files: File[],
  sessionId?: string
): Promise<UploadResponse> {
  const form = new FormData();
  for (const f of files) form.append('files', f);
  if (sessionId) form.append('session_id', sessionId);

  const { data } = await api.post<UploadResponse>('/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

// ── Chat ───────────────────────────────────────────────────────

export async function sendChat(
  sessionId: string,
  message: string
): Promise<ChatResponse> {
  const { data } = await api.post<ChatResponse>('/chat', {
    session_id: sessionId,
    message,
  });
  return data;
}

export async function clearHistory(sessionId: string): Promise<void> {
  await api.delete(`/chat/history/${sessionId}`);
}

// ── Analytics ──────────────────────────────────────────────────

export async function getInsights(
  sessionId: string,
  filename?: string
): Promise<InsightsResponse> {
  const { data } = await api.post<InsightsResponse>('/analytics/insights', {
    session_id: sessionId,
    filename,
  });
  return data;
}

export async function detectAnomalies(
  sessionId: string,
  filename?: string
): Promise<AnomalyResponse> {
  const { data } = await api.post<AnomalyResponse>('/analytics/anomalies', {
    session_id: sessionId,
    filename,
  });
  return data;
}

export async function generateChart(
  sessionId: string,
  query: string,
  filename?: string
): Promise<ChartSpec> {
  const { data } = await api.post<ChartSpec>('/analytics/chart', {
    session_id: sessionId,
    query,
    filename,
  });
  return data;
}

export async function checkQuality(
  sessionId: string,
  filename?: string
): Promise<DataQualityResponse> {
  const { data } = await api.post<DataQualityResponse>('/analytics/quality', {
    session_id: sessionId,
    filename,
  });
  return data;
}

export async function generateDashboard(
  sessionId: string,
  filename?: string,
  prompt?: string
): Promise<DashboardResponse> {
  const { data } = await api.post<DashboardResponse>('/analytics/dashboard', {
    session_id: sessionId,
    filename,
    prompt,
  });
  return data;
}

// ── Sessions ───────────────────────────────────────────────────

export async function getSessions(): Promise<any[]> {
  const { data } = await api.get<any[]>('/sessions');
  return data;
}

export async function getSessionDetails(sessionId: string): Promise<any> {
  const { data } = await api.get<any>(`/sessions/${sessionId}`);
  return data;
}

export async function deleteSession(sessionId: string): Promise<void> {
  await api.delete(`/sessions/${sessionId}`);
}

export async function removeFile(
  sessionId: string,
  filename: string
): Promise<void> {
  await api.delete(`/sessions/${sessionId}/files/${encodeURIComponent(filename)}`);
}

export async function exportReport(sessionId: string): Promise<void> {
  const response = await api.get(`/sessions/${sessionId}/export`, {
    responseType: 'blob',
  });
  const url = URL.createObjectURL(response.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `report_${sessionId.slice(0, 8)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export default api;
