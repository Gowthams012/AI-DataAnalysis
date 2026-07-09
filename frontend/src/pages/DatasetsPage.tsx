import { useAppStore } from '../store/useAppStore';
import { removeFile as apiRemoveFile } from '../services/api';
import { useToast } from '../hooks/useToast';

export default function DatasetsPage() {
  const { sessionId, uploadedFiles, removeFile } = useAppStore();
  const { error: showError } = useToast();

  const handleRemoveFile = async (filename: string) => {
    if (!sessionId) return;
    try {
      await apiRemoveFile(sessionId, filename);
      removeFile(filename);
    } catch (err) {
      showError(err, 'Remove File Failed');
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="topbar">
        <span className="topbar-title">Datasets</span>
        <span className="topbar-spacer" />
        <span className="topbar-badge">{uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''}</span>
      </div>
      
      <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
        {uploadedFiles.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-title">No Datasets</div>
            <div className="empty-state-text">Upload a CSV file from the Home page to get started.</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {uploadedFiles.map((file) => (
              <div key={file.filename} style={{
                background: 'var(--bg-surface)',
                borderRadius: 'var(--r-md)',
                padding: 16,
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-card)',
                display: 'flex',
                flexDirection: 'column',
                gap: 12
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 600, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    {file.filename}
                  </div>
                  <button 
                    onClick={() => handleRemoveFile(file.filename)}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-err)', cursor: 'pointer', fontSize: 18 }}
                    title="Delete dataset"
                  >
                    ×
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
                  <div><strong>Rows:</strong> {file.rows.toLocaleString()}</div>
                  <div><strong>Columns:</strong> {file.columns.toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
