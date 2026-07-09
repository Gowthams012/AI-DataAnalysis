import { useAppStore, createMessage } from '../store/useAppStore';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useState } from 'react';
import { sendChat } from '../services/api';
import { extractErrorMessage } from '../hooks/useToast';

export default function QueriesPage() {
  const { messages, sessionId, addMessage } = useAppStore();
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!input.trim() || !sessionId || isGenerating) return;

    setError(null);
    setIsGenerating(true);

    const userMsg = createMessage('user', input.trim());
    addMessage(userMsg);
    
    try {
      const res = await sendChat(sessionId, input.trim());
      const aiMsg = createMessage('assistant', res.answer);
      aiMsg.reasoning = res.reasoning;
      aiMsg.code = res.code;
      aiMsg.chart_spec = res.chart_spec;
      aiMsg.sql = res.sql;
      aiMsg.follow_up_questions = res.follow_up_questions;
      aiMsg.execution_output = res.execution_output;
      aiMsg.execution_error = res.execution_error;
      addMessage(aiMsg);
      
      setInput('');
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    } finally {
      setIsGenerating(false);
    }
  };

  // Extract all queries (SQL or Code) from assistant messages and find their purpose (user prompt)
  const queries = messages.map((msg, index) => {
    if (msg.role === 'assistant' && (msg.sql || msg.code?.snippet)) {
      const userMsg = messages.slice(0, index).reverse().find(m => m.role === 'user');
      return { msg, purpose: userMsg?.text || 'Automated Query' };
    }
    return null;
  }).filter(Boolean) as { msg: any; purpose: string }[];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Generated Queries</h2>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
          A log of all SQL and Pandas queries generated during this session.
        </p>
      </div>

      {/* Generate Query Input Section */}
      <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-panel)' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>Generate New Query</h3>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <textarea
              className="chat-input"
              style={{ flex: 1, minHeight: 60, padding: 12, borderRadius: 'var(--r-md)', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)', resize: 'vertical' }}
              placeholder="e.g. Write a SQL query to find the top 5 customers by revenue..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isGenerating || !sessionId}
            />
            <button
              className="btn btn-primary"
              style={{ padding: '10px 16px', borderRadius: 'var(--r-md)', whiteSpace: 'nowrap' }}
              onClick={handleGenerate}
              disabled={!input.trim() || isGenerating || !sessionId}
            >
              {isGenerating ? 'Generating...' : 'Generate'}
            </button>
          </div>
          {error && <div style={{ color: '#ef4444', fontSize: 13, marginTop: 8 }}>{error}</div>}
          {!sessionId && <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 8 }}>Start a session by uploading data first.</div>}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {queries.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-title">No Queries Generated Yet</div>
            <div className="empty-state-text">Ask the Chatbot to analyze your data or generate a new query above.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 800, margin: '0 auto' }}>
            {queries.map(({ msg, purpose }) => (
              <QueryCard key={msg.id} msg={msg} purpose={purpose} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function QueryCard({ msg, purpose }: { msg: any; purpose: string }) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const handleCopy = async (text: string, type: 'code' | 'sql') => {
    await navigator.clipboard.writeText(text);
    if (type === 'code') {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
    }
  };

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
          {purpose}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          Generated at {new Date(msg.timestamp).toLocaleTimeString()}
        </div>
      </div>

      {msg.code?.snippet && (
        <div style={{ marginBottom: msg.sql ? 16 : 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-1)' }}>
              {msg.code.language === 'python' ? 'Pandas / Python' : msg.code.language}
            </span>
            <button 
              className="btn btn-ghost btn-sm" 
              style={{ fontSize: 11, padding: '4px 8px' }}
              onClick={() => handleCopy(msg.code.snippet, 'code')}
            >
              {copiedCode ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <div style={{ borderRadius: 'var(--r-sm)', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <SyntaxHighlighter
              language={msg.code.language === 'sql' ? 'sql' : 'python'}
              style={vscDarkPlus}
              customStyle={{ margin: 0, fontSize: 13, padding: 12 }}
            >
              {msg.code.snippet}
            </SyntaxHighlighter>
          </div>
        </div>
      )}

      {msg.sql && (
        <div style={{ marginBottom: (msg.execution_output || msg.execution_error) ? 16 : 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-3)' }}>
              SQL Query
            </span>
            <button 
              className="btn btn-ghost btn-sm" 
              style={{ fontSize: 11, padding: '4px 8px' }}
              onClick={() => handleCopy(msg.sql, 'sql')}
            >
              {copiedSql ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <div className="sql-block" style={{ margin: 0 }}>
            {msg.sql}
          </div>
        </div>
      )}

      {(msg.execution_output || msg.execution_error) && (
        <div style={{ marginTop: 8, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
            Execution Result
          </div>
          
          {msg.execution_error ? (
            <div style={{ padding: '12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 'var(--r-sm)', fontSize: 12, color: '#ef4444', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {msg.execution_error}
            </div>
          ) : (
            <div style={{ padding: '12px', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'monospace', whiteSpace: 'pre-wrap', maxHeight: 300, overflowY: 'auto', wordBreak: 'break-all' }}>
              {msg.execution_output}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
