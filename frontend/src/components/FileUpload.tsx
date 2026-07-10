import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  uploadFiles, 
  getInsights, 
  detectAnomalies, 
  checkQuality, 
  generateDashboard 
} from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { useToast } from '../hooks/useToast';
import { useNavigate } from 'react-router-dom';

export default function FileUpload() {
  const { switchSession, setInsights, setAnomalies, setQuality, setDashboard } = useAppStore();
  const { error: showError, success: showSuccess } = useToast();
  const navigate = useNavigate();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const onDrop = useCallback(
    async (accepted: File[]) => {
      if (!accepted.length) return;
      try {
        // Always force a new session when uploading from the Home Page
        const res = await uploadFiles(accepted, undefined);
        
        const currentSessionId = res.session_id;
        // Properly switch to the new session, which clears out old chats and queries
        switchSession(currentSessionId, res.files);
        
        showSuccess(`${res.files.length} file(s) added successfully. Running analysis...`, 'Upload Complete');
        
        setIsAnalyzing(true);
        const filename = res.files[0].filename;
        
        try {
          const results = await Promise.allSettled([
            getInsights(currentSessionId, filename),
            detectAnomalies(currentSessionId, filename),
            checkQuality(currentSessionId, filename),
            generateDashboard(currentSessionId, filename),
          ]);
          
          if (results[0].status === 'fulfilled') setInsights(results[0].value);
          if (results[1].status === 'fulfilled') setAnomalies(results[1].value);
          if (results[2].status === 'fulfilled') setQuality(results[2].value);
          if (results[3].status === 'fulfilled') setDashboard(results[3].value);
          
          const anyFailed = results.some(r => r.status === 'rejected');
          if (anyFailed) {
            showError("Some analyses could not be completed, but you can still view the results that succeeded.", "Partial Analysis Completed");
          } else {
            showSuccess('Analysis complete! Redirecting...', 'Analysis Done');
          }
          
          navigate('/analytics');
        } catch (analysisErr) {
          console.error("Analysis pipeline failed:", analysisErr);
          showError(analysisErr, 'Automated Analysis Failed');
        } finally {
          setIsAnalyzing(false);
        }
      } catch (err) {
        showError(err, 'Upload Failed');
      }
    },
    [switchSession, navigate, showError, showSuccess, setInsights, setAnomalies, setQuality, setDashboard]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    multiple: true,
  });

  return (
    <div className="upload-wrapper">
      <div
        {...getRootProps()}
        className={`upload-zone ${isDragActive ? 'active' : ''}`}
        id="file-upload-zone"
        role="button"
        aria-label="Upload CSV files"
      >
        <input {...getInputProps()} id="file-input" aria-label="CSV file input" />
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: 16, color: 'var(--accent-1)', display: 'block', margin: '0 auto 16px' }}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
        </svg>
        <h1 className="upload-title">DataAnalytics</h1>
        <p className="upload-subtitle">
          {isDragActive
            ? 'Drop your CSV files here...'
            : 'Drag & drop CSV files here, or click to browse.\nAsk questions in natural language and get instant insights.'}
        </p>
        <div className="upload-formats">
          <span className="upload-format-badge">CSV</span>
          <span className="upload-format-badge">Up to 50 MB</span>
          <span className="upload-format-badge">Multiple files</span>
        </div>
      </div>
      
      {isAnalyzing && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(255,255,255,0.8)',
          backdropFilter: 'var(--glass-blur)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <div className="spinner" style={{ width: 40, height: 40, marginBottom: 16 }}></div>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>Analyzing Dataset...</div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 8 }}>This might take a minute. Generating insights, anomalies, and dashboard...</div>
        </div>
      )}
    </div>
  );
}
