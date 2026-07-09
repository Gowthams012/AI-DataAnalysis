import AnomalyPanel from '../components/AnomalyPanel';

export default function AnomaliesPage() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="topbar">
        <span className="topbar-title">Anomaly Detection</span>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <AnomalyPanel />
      </div>
    </div>
  );
}
