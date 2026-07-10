import { useDropzone } from 'react-dropzone';
import { NavLink } from 'react-router-dom';
import { uploadFiles, removeFile as apiRemoveFile, exportReport, deleteSession } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../store/AuthContext';
import { LogOut, User } from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { ReportTemplate } from './ReportTemplate';
import { useRef, useEffect, useState } from 'react';
import { getSessions, getSessionDetails } from '../services/api';

const NAV_LINKS = [
  { path: '/', label: 'Home' },
  { path: '/datasets', label: 'Datasets' },
  { path: '/dashboard', label: 'Dashboard' },
  { path: '/chat', label: 'Chatbot' },
  { path: '/queries', label: 'Queries' },
  { path: '/analytics', label: 'Analytics' },
  { path: '/anomalies', label: 'Anomalies' },
  { path: '/metrics', label: 'Metrics' },
];

export default function Sidebar() {
  const {
    sessionId,
    uploadedFiles,
    addFiles,
    removeFile,
    setSessionId,
    clearMessages,
    setInsights,
    setAnomalies,
    setQuality,
    switchSession,
  } = useAppStore();
  const { error: showError, success: showSuccess } = useToast();
  const { user, signOut } = useAuth();
  const reportRef = useRef<HTMLDivElement>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);

  useEffect(() => {
    getSessions()
      .then(data => {
        setTotalSessions(data.length);
        setSessions(data.slice(0, 10)); // show top 10
      })
      .catch(console.error);
  }, [user, sessionId]);

  const { open, getInputProps } = useDropzone({
    onDrop: async (accepted) => {
      if (!accepted.length || !sessionId) return;
      try {
        const res = await uploadFiles(accepted, sessionId);
        addFiles(res.files);
        showSuccess(`${res.files.length} file(s) added successfully.`, 'Upload Complete');
      } catch (err) {
        showError(err, 'Upload Failed');
      }
    },
    accept: { 'text/csv': ['.csv'] },
    multiple: true,
    noClick: true,
    noKeyboard: true,
  });

  const handleRemoveFile = async (filename: string) => {
    if (!sessionId) return;
    try {
      await apiRemoveFile(sessionId, filename);
      removeFile(filename);
    } catch (err: any) {
      if (err.response?.status === 404) {
        removeFile(filename); // It's already deleted on the server, remove from UI
      } else {
        showError(err, 'Remove File Failed');
      }
    }
  };

  const handleExport = async () => {
    if (!sessionId || !reportRef.current) return;
    try {
      showSuccess('Generating PDF report...', 'Please wait');
      
      const opt = {
        margin:       10,
        filename:     `analysis_report_${sessionId.slice(0,8)}.pdf`,
        image:        { type: 'jpeg' as const, quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
      };

      // Generate the PDF from the hidden ReportTemplate
      await html2pdf().set(opt).from(reportRef.current).save();
      
      showSuccess('PDF downloaded successfully.', 'Export Complete');
    } catch (err) {
      showError(err, 'PDF Export Failed');
    }
  };

  const handleNewSession = async () => {
    switchSession(null);
    window.location.href = '/';
  };

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <aside className="sidebar" id="sidebar">
      <input {...getInputProps()} />

      {/* Logo */}
      <div className="sidebar-header">
        <div className="logo">
          <span className="logo-text">DataAnalytics</span>
        </div>
        <div className="logo-subtitle">AI-powered Data Analyst</div>
      </div>

      <div className="sidebar-body">
        {/* Navigation */}
        <div className="sidebar-section-title">Navigation</div>
        {NAV_LINKS.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            className={({ isActive }) => `sidebar-nav-btn ${isActive ? 'active' : ''}`}
          >
            {link.label}
          </NavLink>
        ))}

        <div className="divider" style={{ margin: '16px 0', height: 1, background: 'var(--border)' }} />

        {/* Uploaded Files Snippet */}
        <div className="sidebar-section-title">Quick Files ({uploadedFiles.length})</div>
        {uploadedFiles.length === 0 ? (
          <div style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text-muted)' }}>
            No files uploaded yet.
          </div>
        ) : (
          uploadedFiles.slice(0, 3).map((f) => (
            <div key={f.filename} className="sidebar-file-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="sidebar-file-info" style={{ flex: 1, overflow: 'hidden' }}>
                <div className="sidebar-file-name" title={f.filename} style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{f.filename}</div>
              </div>
              <button 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemoveFile(f.filename); }}
                style={{ background: 'transparent', border: 'none', color: 'var(--accent-err)', cursor: 'pointer', fontSize: 16, padding: '0 4px', opacity: 0.7 }}
                title="Delete file"
              >
                ×
              </button>
            </div>
          ))
        )}
        {uploadedFiles.length > 3 && (
          <div style={{ padding: '4px 10px', fontSize: 11, color: 'var(--text-muted)' }}>
            + {uploadedFiles.length - 3} more...
          </div>
        )}

        {sessionId && (
          <button className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: 8 }} onClick={open} id="add-more-files-btn">
            + Add files
          </button>
        )}

        {/* Session ID */}
        {sessionId && (
          <div style={{ marginTop: 16 }}>
            <div className="sidebar-section-title">Current Session</div>
            <div style={{ padding: '0 10px', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--text-muted)', wordBreak: 'break-all' }}>
              {sessionId}
            </div>
          </div>
        )}

        {/* Recent Sessions */}
        {sessions.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <div className="sidebar-section-title">Recent Sessions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '0 10px' }}>
              {sessions.map((s, index) => (
                <div 
                  key={s.session_id} 
                  style={{ 
                    fontSize: 11, 
                    padding: '6px 8px', 
                    borderRadius: 4, 
                    cursor: 'pointer',
                    background: s.session_id === sessionId ? 'var(--bg-input)' : 'transparent',
                    color: s.session_id === sessionId ? 'var(--text-primary)' : 'var(--text-muted)',
                  }}
                  onClick={async () => {
                    if (s.session_id === sessionId) return;
                    try {
                      const details = await getSessionDetails(s.session_id);
                      switchSession(s.session_id, details.files);
                      showSuccess('Switched to previous session');
                    } catch (err) {
                      showError(err, 'Failed to switch session');
                    }
                  }}
                  title={s.session_id}
                >
                  <div style={{ fontWeight: s.session_id === sessionId ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Session {totalSessions - index}
                  </div>
                  <div style={{ fontSize: 9, opacity: 0.7, marginTop: 2 }}>
                    {new Date(s.last_active).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="sidebar-footer">
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', marginBottom: 8, background: 'var(--bg-input)', borderRadius: 8 }}>
            <User size={14} color="var(--text-secondary)" />
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user.email}
            </span>
          </div>
        )}
        {sessionId && (
          <button className="btn btn-ghost btn-sm" style={{ width: '100%', background: 'var(--bg-input)', marginBottom: 8 }} onClick={handleExport} id="export-btn">
            Export Report
          </button>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={handleNewSession} id="new-session-btn">
            New Session
          </button>
          <button className="btn btn-ghost btn-sm" style={{ padding: '0 12px' }} onClick={handleLogout} title="Log Out">
            <LogOut size={16} />
          </button>
        </div>
      </div>
      {/* Hidden container for PDF rendering */}
      <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
        <ReportTemplate ref={reportRef} />
      </div>
    </aside>
  );
}
