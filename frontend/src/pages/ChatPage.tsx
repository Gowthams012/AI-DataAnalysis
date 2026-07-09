import ChatInterface from '../components/ChatInterface';

export default function ChatPage() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="topbar">
        <span className="topbar-title">Chat with Data</span>
      </div>
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <ChatInterface />
      </div>
    </div>
  );
}
