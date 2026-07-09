import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { generateDashboard } from '../services/api';
import ChartRenderer from '../components/ChartRenderer';
import { ChartSpec } from '../types';
import { extractErrorMessage } from '../hooks/useToast';

export default function DashboardPage() {
  const { sessionId } = useAppStore();
  const [charts, setCharts] = useState<ChartSpec[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    if (!sessionId) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const res = await generateDashboard(sessionId);
      setCharts(res.charts);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (sessionId && charts.length === 0 && !isLoading && !error) {
      fetchDashboard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Automated Dashboard</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            AI-generated visualizations based on your dataset patterns.
          </p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={fetchDashboard} 
          disabled={isLoading || !sessionId}
        >
          {isLoading ? 'Generating...' : 'Regenerate'}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {!sessionId ? (
          <div className="empty-state">
            <div className="empty-state-title">No Active Session</div>
            <div className="empty-state-text">Please upload a dataset to generate a dashboard.</div>
          </div>
        ) : isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-secondary)' }}>
            <div className="spinner" style={{ marginBottom: 16 }}></div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Analyzing patterns & generating dashboard...</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>This may take 10-20 seconds.</div>
          </div>
        ) : error ? (
          <div className="empty-state">
            <div className="empty-state-title" style={{ color: '#ef4444' }}>Error Generating Dashboard</div>
            <div className="empty-state-text">{error}</div>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={fetchDashboard}>Try Again</button>
          </div>
        ) : charts.length === 0 ? (
           <div className="empty-state">
            <div className="empty-state-title">No Charts Generated</div>
            <div className="empty-state-text">We couldn't identify meaningful visualizations for this dataset.</div>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
            gap: 20 
          }}>
            {charts.map((chart, idx) => (
              <div key={idx} style={{ 
                background: 'var(--bg-card)', 
                border: '1px solid var(--border)', 
                borderRadius: 'var(--r-md)', 
                padding: 16,
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
              }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12, textAlign: 'center' }}>
                  {chart.title}
                </div>
                <div style={{ height: 350 }}>
                  <ChartRenderer spec={chart} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
