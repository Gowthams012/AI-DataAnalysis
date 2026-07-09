import React, { forwardRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ChartRenderer from './ChartRenderer';

export const ReportTemplate = forwardRef<HTMLDivElement, {}>((_, ref) => {
  const { sessionId, insights, anomalies, quality, dashboard } = useAppStore();

  if (!sessionId) return null;

  const dateStr = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div ref={ref} className="pdf-report-container" style={{ padding: '40px', background: '#fff', color: '#000', width: '210mm', minHeight: '297mm', boxSizing: 'border-box' }}>
      {/* Cover / Header */}
      <div className="pdf-header" style={{ marginBottom: 40, borderBottom: '2px solid #000', paddingBottom: 16 }}>
        <h1 className="pdf-title" style={{ fontSize: 28, margin: 0, fontWeight: 800 }}>Data Analysis Report</h1>
        <p className="pdf-subtitle" style={{ fontSize: 14, color: '#555', margin: '4px 0 0 0' }}>Generated on {dateStr}</p>
        <p className="pdf-meta" style={{ fontSize: 12, color: '#888', margin: '4px 0 0 0', fontFamily: 'monospace' }}>Session ID: {sessionId}</p>
      </div>

      {/* 1. Insights */}
      {insights && (
        <div className="pdf-section" style={{ marginBottom: 40, pageBreakInside: 'avoid' }}>
          <h2 className="pdf-section-title" style={{ fontSize: 20, borderBottom: '1px solid #ccc', paddingBottom: 8, marginBottom: 16 }}>1. Executive Insights</h2>
          <p className="pdf-summary-text" style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>{insights.summary}</p>
          <div className="pdf-insights-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
            {insights.insights.map((ins, i) => (
              <div key={i} className="pdf-insight-card" style={{ padding: 16, border: '1px solid #eee', borderRadius: 8 }}>
                <div className="pdf-insight-header" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: ins.severity === 'high' ? '#fee2e2' : ins.severity === 'medium' ? '#fef3c7' : '#e0e7ff', color: ins.severity === 'high' ? '#b91c1c' : ins.severity === 'medium' ? '#b45309' : '#3730a3' }}>
                    {ins.severity.toUpperCase()}
                  </span>
                  <strong style={{ fontSize: 14 }}>{ins.title}</strong>
                </div>
                <div className="pdf-insight-desc" style={{ fontSize: 13, color: '#444', lineHeight: 1.5 }}>{ins.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Data Quality */}
      {quality && (
        <div className="pdf-section" style={{ marginBottom: 40, pageBreakInside: 'avoid' }}>
          <h2 className="pdf-section-title" style={{ fontSize: 20, borderBottom: '1px solid #ccc', paddingBottom: 8, marginBottom: 16 }}>2. Data Quality Assessment</h2>
          <p className="pdf-summary-text" style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 12 }}>{quality.summary}</p>
          <div className="pdf-quality-score" style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Score: {quality.quality_score}/100</div>
          
          <table className="pdf-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                <th style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>Severity</th>
                <th style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>Issue</th>
                <th style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>Column</th>
                <th style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>Description</th>
              </tr>
            </thead>
            <tbody>
              {quality.issues.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '8px', borderBottom: '1px solid #eee' }}>No quality issues detected.</td>
                </tr>
              ) : (
                quality.issues.map((iss, i) => (
                  <tr key={i}>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>
                      <strong style={{ color: iss.severity === 'high' ? '#dc2626' : iss.severity === 'medium' ? '#d97706' : '#4f46e5' }}>
                        {iss.severity.toUpperCase()}
                      </strong>
                    </td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{iss.issue_type}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{iss.column || '-'}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{iss.description}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 3. Anomalies */}
      {anomalies && (
        <div className="pdf-section" style={{ marginBottom: 40, pageBreakInside: 'avoid' }}>
          <h2 className="pdf-section-title" style={{ fontSize: 20, borderBottom: '1px solid #ccc', paddingBottom: 8, marginBottom: 16 }}>3. Anomaly Detection</h2>
          <p className="pdf-summary-text" style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 12 }}>{anomalies.summary}</p>
          <div className="pdf-anomaly-stats" style={{ fontSize: 13, marginBottom: 20, padding: '8px 12px', background: '#f3f4f6', borderRadius: 4 }}>
            <strong>{anomalies.total_anomalies} anomalies</strong> detected ({anomalies.anomaly_percentage}% of rows).
          </div>
          
          <div className="pdf-anomaly-list" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {anomalies.anomalies.map((anom) => (
              <div key={anom.row_index} className="pdf-anomaly-item" style={{ pageBreakInside: 'avoid', borderLeft: '3px solid #ef4444', paddingLeft: 12 }}>
                <div className="pdf-anomaly-header" style={{ fontSize: 14, marginBottom: 4 }}>
                  <strong>Row #{anom.row_index}</strong> <span style={{ color: '#666', fontSize: 12 }}>(Score: {anom.anomaly_score.toFixed(4)})</span>
                </div>
                <div className="pdf-anomaly-reason" style={{ fontSize: 13, color: '#333' }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{anom.explanation}</ReactMarkdown>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* 4. Dashboard */}
      {dashboard && dashboard.length > 0 && (
        <div className="pdf-section" style={{ marginBottom: 40, pageBreakInside: 'avoid' }}>
          <h2 className="pdf-section-title" style={{ fontSize: 20, borderBottom: '1px solid #ccc', paddingBottom: 8, marginBottom: 16 }}>4. Dashboard Visualizations</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {dashboard.map((chart, i) => (
              <div key={i} style={{ pageBreakInside: 'avoid', border: '1px solid #eee', padding: 16, borderRadius: 8 }}>
                <h3 style={{ fontSize: 16, marginBottom: 12 }}>{chart.title}</h3>
                {/* For PDF export, we must give a fixed layout box so ResponsiveContainer can resolve its size */}
                <div style={{ width: '700px', height: '400px', margin: '0 auto' }}>
                  <ChartRenderer spec={chart} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
