import { getInsights } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { useToast } from '../hooks/useToast';
import type { InsightItem } from '../types';

const CATEGORY_ICONS: Record<string, string> = {
  trend: '',
  outlier: '',
  pattern: '',
  correlation: '',
  summary: '',
};

export default function InsightsPanel() {
  const { sessionId, insights, setInsights, isAnalyticsLoading, setIsAnalyticsLoading } = useAppStore();
  const { error: showError } = useToast();

  const run = async () => {
    if (!sessionId || isAnalyticsLoading) return;
    setIsAnalyticsLoading(true);
    try {
      const res = await getInsights(sessionId);
      setInsights(res);
    } catch (err) {
      showError(err, 'Insight Generation Failed');
    } finally {
      setIsAnalyticsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>AI Insights</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>LLM-generated business insights</div>
        </div>
        <button
          id="run-insights-btn"
          className="btn btn-primary"
          onClick={run}
          disabled={!sessionId || isAnalyticsLoading}
        >
          {isAnalyticsLoading ? <><span className="spinner" /> Analyzing…</> : 'Generate Insights'}
        </button>
      </div>

      {!insights && !isAnalyticsLoading && (
        <div className="empty-state">
          <div className="empty-state-title">No insights generated yet</div>
          <div className="empty-state-text">Click "Generate Insights" to get AI-powered analysis of your data.</div>
        </div>
      )}

      {insights && (
        <>
          {/* Executive summary */}
          <div style={{ padding: '14px 20px', background: 'rgba(99,102,241,0.06)', borderBottom: '1px solid var(--border)', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--accent-1)', marginBottom: 6 }}>
              Executive Summary
            </div>
            {insights.summary}
          </div>

          {/* Insight cards */}
          <div className="panel-scroll">
            <div className="insight-grid">
              {insights.insights.map((item, i) => (
                <InsightCard key={i} item={item} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function InsightCard({ item }: { item: InsightItem }) {
  return (
    <div className="insight-card">
      <div className="insight-card-header">
        <div className="insight-card-title">
          {item.title}
        </div>
        <span className={`severity-badge severity-${item.severity}`}>{item.severity}</span>
      </div>
      <span className="category-badge">{item.category}</span>
      <div className="insight-card-desc">{item.description}</div>
    </div>
  );
}
