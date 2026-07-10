import { checkQuality } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { useToast } from '../hooks/useToast';
import type { QualityIssue } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const SEVERITY_COLOR: Record<string, string> = {
  high: 'var(--accent-err)',
  medium: 'var(--accent-warn)',
  low: 'var(--accent-4)',
};

const ISSUE_ICONS: Record<string, string> = {
  missing_values: '',
  duplicate_rows: '',
  outliers: '',
  constant_column: '',
  high_cardinality: '',
};

function ScoreRing({ score }: { score: number }) {
  const r = 42;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <div className="quality-score-ring">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
        <circle
          cx="50" cy="50" r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="quality-score-text">
        <span className="quality-score-number" style={{ color }}>{score}</span>
        <span className="quality-score-label">/ 100</span>
      </div>
    </div>
  );
}

export default function QualityPanel() {
  const { sessionId, quality, setQuality, isAnalyticsLoading, setIsAnalyticsLoading } = useAppStore();
  const { error: showError } = useToast();

  const run = async () => {
    if (!sessionId || isAnalyticsLoading) return;
    setIsAnalyticsLoading(true);
    try {
      const res = await checkQuality(sessionId);
      setQuality(res);
    } catch (err) {
      showError(err, 'Quality Check Failed');
    } finally {
      setIsAnalyticsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Data Quality</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Missing values · duplicates · outliers</div>
        </div>
        <button
          id="run-quality-btn"
          className="btn btn-primary"
          onClick={run}
          disabled={!sessionId || isAnalyticsLoading}
        >
          {isAnalyticsLoading ? <><span className="spinner" /> Checking…</> : 'Check Quality'}
        </button>
      </div>

      {!quality && !isAnalyticsLoading && (
        <div className="empty-state">
          <div className="empty-state-title">Quality check not run yet</div>
          <div className="empty-state-text">Click "Check Quality" to audit your dataset for common data issues.</div>
        </div>
      )}

      {quality && (
        <>
          {/* Score + Summary */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 20, alignItems: 'center' }}>
            <ScoreRing score={quality.quality_score} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                Quality Score
              </div>
              <div className="markdown-body" style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{quality.summary}</ReactMarkdown>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                {quality.rows_analyzed.toLocaleString()} rows analyzed · {quality.issues.length} issues found
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ padding: '0 20px 12px' }}>
            <div style={{ marginTop: 12 }}>
              <div className="progress-bar-track">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${quality.quality_score}%`,
                    background: quality.quality_score >= 80
                      ? 'linear-gradient(90deg, #10b981, #06b6d4)'
                      : quality.quality_score >= 60
                        ? 'linear-gradient(90deg, #f59e0b, #f97316)'
                        : 'linear-gradient(90deg, #ef4444, #ec4899)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Issue list */}
          <div className="quality-issues-list panel-scroll">
            {quality.issues.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-title">No issues found!</div>
                <div className="empty-state-text">Your dataset looks clean and well-formed.</div>
              </div>
            ) : (
              quality.issues.map((issue, i) => <QualityIssueCard key={i} issue={issue} />)
            )}
          </div>
        </>
      )}
    </div>
  );
}

function QualityIssueCard({ issue }: { issue: QualityIssue }) {
  const color = SEVERITY_COLOR[issue.severity] ?? 'var(--text-muted)';

  return (
    <div className="quality-issue-item">
      <div className="quality-issue-header">
        <span className="quality-issue-type">{issue.issue_type.replace(/_/g, ' ')}</span>
        {issue.column && <span className="quality-issue-col">{issue.column}</span>}
        <span className={`severity-badge severity-${issue.severity}`}>{issue.severity}</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
          {issue.affected_rows} rows
        </span>
      </div>
      <div className="quality-issue-desc">{issue.description}</div>
      <div className="quality-issue-rec">
        <span>💡</span>
        <span>{issue.recommendation}</span>
      </div>
    </div>
  );
}
