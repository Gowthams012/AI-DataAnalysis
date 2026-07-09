import {
  AreaChart, Area,
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { ChartSpec } from '../types';

const DEFAULT_COLORS = [
  '#6366f1', '#8b5cf6', '#06b6d4', '#10b981',
  '#f59e0b', '#ef4444', '#ec4899', '#84cc16',
];

interface Props {
  spec: ChartSpec;
}

export default function ChartRenderer({ spec }: Props) {
  const { type, title, data, xKey, yKeys, xLabel, yLabel, nameKey, valueKey } = spec;

  if (!data || data.length === 0) {
    return (
      <div className="chart-wrapper">
        <div className="chart-title">{title}</div>
        <div className="empty-state" style={{ padding: 20, minHeight: 120 }}>
          <span>No chart data available.</span>
        </div>
      </div>
    );
  }

  // Bulletproof the keys based on ACTUAL data available
  const actualKeys = Object.keys(data[0] || {});
  const safeXKey = (xKey && actualKeys.includes(xKey)) ? xKey : (actualKeys.find(k => k !== 'value' && k !== 'index') || actualKeys[0]);
  
  const validatedYKeys = yKeys?.filter(yk => actualKeys.includes(yk.key)) || [];
  const safeYKeys = validatedYKeys.length > 0 
    ? validatedYKeys 
    : [{ key: actualKeys.find(k => k !== safeXKey) ?? actualKeys[0], color: DEFAULT_COLORS[0], name: '' }];

  const tooltipStyle = {
    background: 'rgba(255,255,255,0.95)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    color: 'var(--text-primary)',
    fontSize: 12,
    boxShadow: 'var(--shadow-card)',
  };

  return (
    <div className="chart-wrapper" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 350 }}>
      <div className="chart-title" style={{ flexShrink: 0, fontWeight: 600, marginBottom: 16 }}>{title}</div>
      <div style={{ flex: 1, minHeight: 0, width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        {type === 'bar' ? (
          <BarChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 70 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey={safeXKey} height={60} tick={{ fontSize: 11, fill: '#9494b8', angle: -35, textAnchor: 'end' }} label={xLabel ? { value: xLabel, position: 'insideBottom', offset: -15, fill: '#9494b8', fontSize: 11 } : undefined} />
            <YAxis tick={{ fontSize: 11, fill: '#9494b8' }} label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft', offset: 0, fill: '#9494b8', fontSize: 11 } : undefined} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend verticalAlign="top" wrapperStyle={{ fontSize: 12, color: '#9494b8', paddingBottom: 16 }} />
            {safeYKeys.map((yk, i) => (
              <Bar key={yk.key} dataKey={yk.key} name={yk.name || yk.key} fill={yk.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length]} radius={[4, 4, 0, 0]} isAnimationActive={false} />
            ))}
          </BarChart>
        ) : type === 'line' ? (
          <LineChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 70 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey={safeXKey} height={60} tick={{ fontSize: 11, fill: '#9494b8', angle: -35, textAnchor: 'end' }} />
            <YAxis tick={{ fontSize: 11, fill: '#9494b8' }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend verticalAlign="top" wrapperStyle={{ fontSize: 12, color: '#9494b8', paddingBottom: 16 }} />
            {safeYKeys.map((yk, i) => (
              <Line key={yk.key} type="monotone" dataKey={yk.key} name={yk.name || yk.key} stroke={yk.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} isAnimationActive={false} />
            ))}
          </LineChart>
        ) : type === 'area' ? (
          <AreaChart data={data} margin={{ top: 10, right: 30, left: 10, bottom: 70 }}>
            <defs>
              {safeYKeys.map((yk, i) => (
                <linearGradient key={yk.key} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={yk.color || DEFAULT_COLORS[i]} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={yk.color || DEFAULT_COLORS[i]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey={safeXKey} height={60} tick={{ fontSize: 11, fill: '#9494b8', angle: -35, textAnchor: 'end' }} />
            <YAxis tick={{ fontSize: 11, fill: '#9494b8' }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend verticalAlign="top" wrapperStyle={{ fontSize: 12, color: '#9494b8', paddingBottom: 16 }} />
            {safeYKeys.map((yk, i) => (
              <Area key={yk.key} type="monotone" dataKey={yk.key} name={yk.name || yk.key} stroke={yk.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length]} fill={`url(#grad-${i})`} strokeWidth={2} isAnimationActive={false} />
            ))}
          </AreaChart>
        ) : type === 'pie' ? (
          <PieChart>
            <Pie
              data={data}
              dataKey={valueKey && actualKeys.includes(valueKey) ? valueKey : (safeYKeys[0]?.key || 'value')}
              nameKey={nameKey && actualKeys.includes(nameKey) ? nameKey : (safeXKey || 'name')}
              cx="50%" cy="50%"
              outerRadius={110}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
              labelLine={{ stroke: 'rgba(0,0,0,0.1)' }}
              isAnimationActive={false}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={DEFAULT_COLORS[i % DEFAULT_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            <Legend verticalAlign="top" wrapperStyle={{ fontSize: 12, color: '#9494b8', paddingBottom: 16 }} />
          </PieChart>
        ) : type === 'scatter' ? (
          <ScatterChart margin={{ top: 10, right: 30, left: 10, bottom: 70 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey={safeXKey} type="number" name={xLabel || safeXKey} height={60} tick={{ fontSize: 11, fill: '#9494b8', angle: -35, textAnchor: 'end' }} />
            <YAxis dataKey={safeYKeys[0]?.key} type="number" name={yLabel || safeYKeys[0]?.key} tick={{ fontSize: 11, fill: '#9494b8' }} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: '3 3' }} />
            <Scatter data={data} fill={safeYKeys[0]?.color || DEFAULT_COLORS[0]} isAnimationActive={false} />
          </ScatterChart>
        ) : (
          <BarChart data={data}>
            <XAxis dataKey={safeXKey} />
            <YAxis />
            <Bar dataKey={safeYKeys[0]?.key || 'value'} fill={DEFAULT_COLORS[0]} isAnimationActive={false} />
          </BarChart>
        )}
      </ResponsiveContainer>
      </div>
    </div>
  );
}
