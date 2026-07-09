import { useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { ToastType } from '../types';

/** Extract a clean, user-friendly error message from an Axios error or plain Error. */
export function extractErrorMessage(err: unknown): string {
  if (!err) return 'An unknown error occurred.';

  const axiosErr = err as any;

  // Axios response with detail field (FastAPI format)
  const detail = axiosErr?.response?.data?.detail;
  if (detail) {
    const msg = typeof detail === 'string' ? detail : JSON.stringify(detail);

    // Gemini auth errors
    if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
      return (
        'Invalid Gemini API key. ' +
        'Edit backend/.env and set GEMINI_API_KEY to a valid key ' +
        '(starts with "AIza…"). ' +
        'Get a free key at aistudio.google.com/app/apikey, then restart the backend.'
      );
    }

    // Long tracebacks — show first meaningful line
    if (msg.length > 300) {
      const firstLine = msg.split('\n').find((l) => l.trim().length > 0) ?? msg;
      return firstLine.slice(0, 250);
    }
    return msg;
  }

  // Network-level errors (CORS, server not running)
  if (axiosErr?.code === 'ERR_NETWORK' || axiosErr?.message?.includes('Network Error')) {
    return 'Cannot reach the backend server. Make sure it is running on http://localhost:8000.';
  }
  if (axiosErr?.code === 'ECONNABORTED') {
    return 'Request timed out. The LLM took too long to respond — try a simpler question.';
  }

  if (axiosErr?.message) return axiosErr.message;
  if (err instanceof Error) return err.message;
  return String(err);
}

/** Hook that returns a toast() helper function. */
export function useToast() {
  const addToast = useAppStore((s) => s.addToast);

  const toast = useCallback(
    (type: ToastType, title: string, message: string) => {
      addToast({ type, title, message });
    },
    [addToast]
  );

  const error = useCallback(
    (err: unknown, title = 'Error') => {
      addToast({ type: 'error', title, message: extractErrorMessage(err) });
    },
    [addToast]
  );

  const success = useCallback(
    (message: string, title = 'Success') => {
      addToast({ type: 'success', title, message });
    },
    [addToast]
  );

  const warn = useCallback(
    (message: string, title = 'Warning') => {
      addToast({ type: 'warning', title, message });
    },
    [addToast]
  );

  return { toast, error, success, warn };
}
