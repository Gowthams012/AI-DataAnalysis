import { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { sendChat, clearHistory } from '../services/api';
import { useAppStore, createMessage } from '../store/useAppStore';
import { extractErrorMessage } from '../hooks/useToast';
import ChartRenderer from './ChartRenderer';
import type { UIMessage } from '../types';

const SUGGESTIONS = [
  'Which region generated the highest revenue?',
  'Show monthly sales trends.',
  'Which products are underperforming?',
  'What are the top five customers?',
  'Generate SQL for this analysis.',
  'Detect anomalies in the dataset.',
];

export default function ChatInterface() {
  const { sessionId, messages, addMessage, updateMessage, clearMessages, isChatLoading, setIsChatLoading } =
    useAppStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(
    async (text: string) => {
      if (!text.trim() || !sessionId || isChatLoading) return;

      const userMsg = createMessage('user', text.trim());
      addMessage(userMsg);
      setInput('');

      const loadingMsg = createMessage('assistant', '', { isLoading: true });
      addMessage(loadingMsg);
      setIsChatLoading(true);

      try {
        const res = await sendChat(sessionId, text.trim());
        updateMessage(loadingMsg.id, {
          isLoading: false,
          text: res.answer,
          reasoning: res.reasoning,
          code: res.code,
          chart_spec: res.chart_spec,
          sql: res.sql,
          follow_up_questions: res.follow_up_questions,
          execution_output: res.execution_output,
          execution_error: res.execution_error,
        });
      } catch (err: unknown) {
        updateMessage(loadingMsg.id, {
          isLoading: false,
          text: `❌ ${extractErrorMessage(err)}`,
        });
      } finally {
        setIsChatLoading(false);
      }
    },
    [sessionId, isChatLoading, addMessage, updateMessage, setIsChatLoading]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  const handleClear = async () => {
    if (!sessionId) return;
    await clearHistory(sessionId);
    clearMessages();
  };

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  };

  return (
    <div className="chat-container">
      {/* Messages */}
      <div className="chat-messages" id="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-welcome">
            <h2 className="chat-welcome-title">Ask me anything about your data</h2>
            <p className="chat-welcome-text">
              I can answer questions, generate charts, detect anomalies, write code, and explain my reasoning.
            </p>
            <div className="suggestion-grid">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  className="suggestion-btn"
                  onClick={() => handleSend(s)}
                  id={`suggestion-${s.slice(0, 20).replace(/\s/g, '-')}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} message={msg} onFollowUp={handleSend} />)
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="chat-input-area">
        <div className="chat-input-wrapper">
          <textarea
            ref={textareaRef}
            id="chat-input"
            className="chat-input"
            placeholder="Ask a question about your data… (Shift+Enter for newline)"
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            rows={1}
            disabled={isChatLoading}
          />
          <button
            id="chat-send-btn"
            className="chat-send-btn"
            onClick={() => handleSend(input)}
            disabled={!input.trim() || isChatLoading}
            aria-label="Send message"
          >
            {isChatLoading ? <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> : '↑'}
          </button>
        </div>
        {messages.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
            <button className="btn btn-ghost btn-sm" onClick={handleClear} id="clear-history-btn">
              Clear history
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Message Bubble ─────────────────────────────────────────────

function MessageBubble({ message, onFollowUp }: { message: UIMessage; onFollowUp: (q: string) => void }) {
  const [showReasoning, setShowReasoning] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (message.isLoading) {
    return (
      <div className="message assistant" id={`msg-${message.id}`}>
        <div className="message-avatar">AI</div>
        <div className="message-body">
          <div className="loading-dots">
            <span /><span /><span />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`message ${message.role}`} id={`msg-${message.id}`}>
      <div className="message-avatar">{message.role === 'user' ? 'U' : 'AI'}</div>
      <div className="message-body">
        {/* Main text bubble */}
        <div className="message-bubble">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.text}</ReactMarkdown>
        </div>

        {/* Reasoning */}
        {message.reasoning && (
          <div className="message-reasoning" onClick={() => setShowReasoning(!showReasoning)}>
            <div className="message-reasoning-title">
              Reasoning {showReasoning ? '▲' : '▼'}
            </div>
            {showReasoning && <p style={{ fontSize: 12, lineHeight: 1.6, marginTop: 4 }}>{message.reasoning}</p>}
          </div>
        )}


        {/* Chart */}
        {message.chart_spec && message.chart_spec.data?.length > 0 && (
          <div style={{ height: 350, width: '100%', marginTop: 12, background: 'var(--bg-card)', padding: 12, borderRadius: 8, border: '1px solid var(--border)' }}>
            <ChartRenderer spec={message.chart_spec} />
          </div>
        )}

        {/* Follow-up questions */}
        {message.follow_up_questions && message.follow_up_questions.length > 0 && (
          <div className="follow-up-list">
            {message.follow_up_questions.map((q) => (
              <button key={q} className="follow-up-btn" onClick={() => onFollowUp(q)}>
                {q}
              </button>
            ))}
          </div>
        )}

        <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}
