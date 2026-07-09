import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { Toast } from '../types';

const ICONS: Record<string, string> = {
  error:   '❌',
  warning: '⚠️',
  success: '✅',
  info:    'ℹ️',
};

const COLORS: Record<string, { bg: string; border: string; title: string }> = {
  error:   { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.35)',   title: '#ef4444' },
  warning: { bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.35)',  title: '#f59e0b' },
  success: { bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.35)', title: '#10b981' },
  info:    { bg: 'rgba(99,102,241,0.12)', border: 'rgba(99,102,241,0.35)',  title: '#6366f1' },
};

function ToastItem({ toast }: { toast: Toast }) {
  const removeToast = useAppStore((s) => s.removeToast);
  const c = COLORS[toast.type] ?? COLORS.info;

  useEffect(() => {
    const timer = setTimeout(() => removeToast(toast.id), 6000);
    return () => clearTimeout(timer);
  }, [toast.id, removeToast]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '14px 16px',
        borderRadius: 12,
        background: c.bg,
        border: `1px solid ${c.border}`,
        backdropFilter: 'blur(16px)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        minWidth: 300,
        maxWidth: 440,
        animation: 'toastIn 0.25s ease',
      }}
    >
      <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{ICONS[toast.type]}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: c.title, marginBottom: 3 }}>
          {toast.title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, wordBreak: 'break-word' }}>
          {toast.message}
        </div>
      </div>
      <button
        onClick={() => removeToast(toast.id)}
        style={{
          background: 'none', border: 'none', color: 'var(--text-muted)',
          cursor: 'pointer', fontSize: 16, padding: '0 2px', flexShrink: 0,
          lineHeight: 1,
        }}
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  );
}

export default function ToastContainer() {
  const toasts = useAppStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
      <div
        id="toast-container"
        style={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => (
          <div key={t.id} style={{ pointerEvents: 'auto' }}>
            <ToastItem toast={t} />
          </div>
        ))}
      </div>
    </>
  );
}
