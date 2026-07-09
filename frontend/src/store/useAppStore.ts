import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type {
  AppState,
  AnomalyResponse,
  DataQualityResponse,
  FileProfile,
  InsightsResponse,
  PanelView,
  UIMessage,
} from '../types';

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
  // ── Session ────────────────────────────────────────────────
  sessionId: null,
  setSessionId: (id) => set({ sessionId: id }),

  // ── Files ──────────────────────────────────────────────────
  uploadedFiles: [],
  setUploadedFiles: (files) => set({ uploadedFiles: files }),
  addFiles: (files) =>
    set((state) => ({
      uploadedFiles: [
        ...state.uploadedFiles.filter(
          (f) => !files.some((nf) => nf.filename === f.filename)
        ),
        ...files,
      ],
    })),
  removeFile: (filename) =>
    set((state) => ({
      uploadedFiles: state.uploadedFiles.filter((f) => f.filename !== filename),
    })),

  // ── Chat ───────────────────────────────────────────────────
  messages: [],
  addMessage: (msg) =>
    set((state) => ({ messages: [...state.messages, msg] })),
  updateMessage: (id, updates) =>
    set((state) => ({
      messages: state.messages.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
    })),
  clearMessages: () => set({ messages: [] }),

  // ── Panel ──────────────────────────────────────────────────
  // Removed activePanel since we use react-router for navigation

  // ── Analytics Data ─────────────────────────────────────────
  insights: null,
  setInsights: (data) => set({ insights: data }),
  anomalies: null,
  setAnomalies: (data) => set({ anomalies: data }),
  quality: null,
  setQuality: (data) => set({ quality: data }),

  // ── Loading ────────────────────────────────────────────────
  isChatLoading: false,
  setIsChatLoading: (v) => set({ isChatLoading: v }),
  isAnalyticsLoading: false,
  setIsAnalyticsLoading: (v) => set({ isAnalyticsLoading: v }),

  // ── Toast notifications ─────────────────────────────────────
  toasts: [],
  addToast: (toast) =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        { ...toast, id: uuidv4(), createdAt: Date.now() },
      ],
    })),
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}),
{
  name: 'data-analytics-storage',
}
));

/** Helper to create a new UI message with a unique ID. */
export function createMessage(
  role: UIMessage['role'],
  text: string,
  extras: Partial<UIMessage> = {}
): UIMessage {
  return {
    id: uuidv4(),
    role,
    text,
    timestamp: new Date(),
    ...extras,
  };
}
