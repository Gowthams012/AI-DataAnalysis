import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadFiles } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { useToast } from '../hooks/useToast';
import { useNavigate } from 'react-router-dom';

export default function FileUpload() {
  const { sessionId, setSessionId, addFiles } = useAppStore();
  const { error: showError } = useToast();
  const navigate = useNavigate();

  const onDrop = useCallback(
    async (accepted: File[]) => {
      if (!accepted.length) return;
      try {
        const res = await uploadFiles(accepted, sessionId ?? undefined);
        setSessionId(res.session_id);
        addFiles(res.files);
        navigate('/datasets');
      } catch (err) {
        showError(err, 'Upload Failed');
      }
    },
    [sessionId, setSessionId, addFiles, navigate, showError]
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
    </div>
  );
}
