import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadFiles } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { useToast } from '../hooks/useToast';
import FileUpload from '../components/FileUpload';

export default function HomePage() {
  const { sessionId, addFiles } = useAppStore();
  const { error: showError, success: showSuccess } = useToast();

  const onDrop = useCallback(
    async (accepted: File[]) => {
      if (!accepted.length || !sessionId) return;
      try {
        const res = await uploadFiles(accepted, sessionId);
        addFiles(res.files);
        showSuccess(`${res.files.length} file(s) added successfully.`, 'Upload Complete');
      } catch (err) {
        showError(err, 'Upload Failed');
      }
    },
    [sessionId, addFiles, showError, showSuccess]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    multiple: true,
    noClick: true,
  });

  return (
    <div {...getRootProps()} style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <input {...getInputProps()} />

      <div className="topbar">
        <span className="topbar-title">Welcome to DataAnalytics</span>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', padding: 20 }}>
        {isDragActive && sessionId && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 999,
            background: 'rgba(255,255,255,0.7)',
            backdropFilter: 'var(--glass-blur)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px dashed var(--accent-1)',
            pointerEvents: 'none',
          }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--accent-1)' }}>
              Drop CSV files to add them
            </div>
          </div>
        )}
        <FileUpload />
      </div>
    </div>
  );
}
