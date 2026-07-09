import { useState } from 'react';
import { detectAnomalies } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { useToast } from '../hooks/useToast';
import type { AnomalyItem } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function AnomalyPanel() {
  const { sessionId, anomalies, setAnomalies, isAnalyticsLoading, setIsAnalyticsLoading } = useAppStore();
  const [expanded, setExpanded] = useState<number | null>(null);
  const { error: showError } = useToast();

  const run = async () => {
    if (!sessionId || isAnalyticsLoading) return;
    setIsAnalyticsLoading(true);
    try {
      const res = await detectAnomalies(sessionId);
      setAnomalies(res);
    } catch (err) {
      showError(err, 'Anomaly Detection Failed');
    } finally {
      setIsAnalyticsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div className="anomaly-header">
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Anomaly Detection</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Isolation Forest algorithm · LLM-explained
          </div>
        </div>
        <button
          id="run-anomaly-btn"
          className="btn btn-primary"
          onClick={run}
          disabled={!sessionId || isAnalyticsLoading}
        >
          {isAnalyticsLoading ? <><span className="spinner" /> Detecting…</> : 'Detect Anomalies'}
        </button>
      </div>

      {!anomalies && !isAnalyticsLoading && (
        <div className="empty-state">
          <div className="empty-state-title">No anomaly scan yet</div>
          <div className="empty-state-text">Click "Detect Anomalies" to scan your data for unusual patterns.</div>
        </div>
      )}

      {anomalies && (
        <>
          {/* Stats row */}
          <div style={{ display: 'flex', gap: 12, padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
            <StatCard value={anomalies.total_anomalies} label="Anomalies" color="var(--accent-err)" />
            <StatCard value={`${anomalies.anomaly_percentage}%`} label="of Rows" color="var(--accent-warn)" />
            <StatCard value={anomalies.columns_used.length} label="Columns Used" color="var(--accent-1)" />
          </div>

          {/* Summary */}
          <div style={{ padding: '12px 20px', fontSize: 13, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)', lineHeight: 1.6 }}>
            {anomalies.summary}
          </div>

          {/* Columns used */}
          <div style={{ padding: '8px 20px', display: 'flex', flexWrap: 'wrap', gap: 6, borderBottom: '1px solid var(--border)' }}>
            {anomalies.columns_used.map((c) => (
              <span key={c} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: 'rgba(99,102,241,0.12)', color: 'var(--accent-1)', border: '1px solid var(--border-accent)', fontFamily: 'JetBrains Mono, monospace' }}>
                {c}
              </span>
            ))}
          </div>

          {/* Anomaly list */}
          <div className="anomaly-list panel-scroll">
            {anomalies.anomalies.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-title">No anomalies detected</div>
                <div className="empty-state-text">All rows appear to be within expected ranges.</div>
              </div>
            ) : (
              anomalies.anomalies.map((a) => (
                <AnomalyCard
                  key={a.row_index}
                  item={a}
                  isExpanded={expanded === a.row_index}
                  onToggle={() => setExpanded(expanded === a.row_index ? null : a.row_index)}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ value, label, color }: { value: number | string; label: string; color: string }) {
  return (
    <div className="anomaly-stat">
      <div className="anomaly-stat-value" style={{ color }}>{value}</div>
      <div className="anomaly-stat-label">{label}</div>
    </div>
  );
}

function AnomalyCard({ item, isExpanded, onToggle }: { item: AnomalyItem; isExpanded: boolean; onToggle: () => void }) {
  const numericCols = Object.entries(item.row_data)
    .filter(([, v]) => typeof v === 'number')
    .slice(0, 6);

  return (
    <div className="anomaly-item" onClick={onToggle} style={{ cursor: 'pointer' }}>
      <div className="anomaly-item-header">
        <span className="anomaly-row-label">Row #{item.row_index}</span>
        <span className="anomaly-score-badge">score: {item.anomaly_score.toFixed(4)}</span>
      </div>
      <div className="anomaly-explanation" style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8, marginBottom: 8, lineHeight: 1.5 }}>
        <strong style={{ color: 'var(--text-primary)' }}>Reason:</strong> 
        <div style={{ marginTop: 4, marginLeft: 8 }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.explanation}</ReactMarkdown>
        </div>
      </div>
      {isExpanded && (
        <div className="anomaly-data">
          {numericCols.map(([k, v]) => (
            <span key={k} className="anomaly-data-chip">
              {k}: {typeof v === 'number' ? v.toFixed(2) : String(v)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
