import QualityPanel from '../components/QualityPanel';

export default function MetricsPage() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="topbar">
        <span className="topbar-title">Evaluation Metrics</span>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <QualityPanel />
      </div>
    </div>
  );
}
