import InsightsPanel from '../components/InsightsPanel';

export default function AnalyticsPage() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="topbar">
        <span className="topbar-title">Analytics & Visualizations</span>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <InsightsPanel />
      </div>
    </div>
  );
}
