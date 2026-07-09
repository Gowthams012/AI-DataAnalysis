import { useEffect, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { generateDashboard } from '../services/api';
import ChartRenderer from '../components/ChartRenderer';
import { ChartSpec } from '../types';
import { extractErrorMessage } from '../hooks/useToast';

export default function DashboardPage() {
  const { sessionId, uploadedFiles } = useAppStore();
  const [charts, setCharts] = useState<ChartSpec[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string>('');

  const fetchDashboard = async (fileToUse?: string) => {
    if (!sessionId) return;
    const file = fileToUse || selectedFile;
    if (uploadedFiles.length > 1 && !file) {
      setError('Please select a dataset to analyze.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const res = await generateDashboard(sessionId, file);
      setCharts(res.charts);
      useAppStore.getState().setDashboard(res.charts);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (sessionId && uploadedFiles.length > 0) {
      if (uploadedFiles.length === 1) {
        setSelectedFile(uploadedFiles[0].filename);
        if (charts.length === 0 && !isLoading && !error) {
          fetchDashboard(uploadedFiles[0].filename);
        }
      } else if (!selectedFile) {
        // Just set the first one as default selected, but don't auto-fetch if we want them to choose
        setSelectedFile(uploadedFiles[0].filename);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, uploadedFiles]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Automated Dashboard</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
            AI-generated visualizations based on your dataset patterns.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {uploadedFiles.length > 1 && (
            <select 
              value={selectedFile} 
              onChange={(e) => setSelectedFile(e.target.value)}
              className="chat-input"
              style={{ width: 'auto', padding: '6px 12px', minHeight: 'unset', height: 36, fontSize: 13 }}
            >
              {uploadedFiles.map(f => (
                <option key={f.filename} value={f.filename}>{f.filename}</option>
              ))}
            </select>
          )}
          <button 
            className="btn btn-primary" 
            onClick={() => fetchDashboard()} 
            disabled={isLoading || !sessionId || (uploadedFiles.length > 1 && !selectedFile)}
          >
            {isLoading ? 'Generating...' : charts.length > 0 ? 'Regenerate' : 'Generate'}
          </button>
        </div>
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
