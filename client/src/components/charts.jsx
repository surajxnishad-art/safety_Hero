import React from 'react';

const PALETTE = ['#2589D8', '#FF7900', '#16A36A', '#F5B942', '#DC3545', '#7C4DFF', '#1769AA', '#00A6A6'];

const scale = (value, min, max, outMin, outMax) => {
  if (max === min) return outMin;
  return outMin + ((value - min) / (max - min)) * (outMax - outMin);
};

export function LineChart({ data = [], series = [], height = 230, showArea = true, yLabel }) {
  const w = 760;
  const h = height;
  const pad = { l: 42, r: 14, t: 16, b: 28 };
  const all = data.flatMap((d) => series.map((s) => Number(d[s.key]) || 0));
  const max = Math.max(1, ...all) * 1.12;
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const x = (i) => pad.l + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = (v) => pad.t + innerH - (Number(v) || 0) / max * innerH;
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <svg className="chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={yLabel || 'Trend chart'} preserveAspectRatio="none">
      <defs>
        {series.map((s, i) => (
          <linearGradient key={s.key} id={`lg-${i}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={s.color || PALETTE[i % PALETTE.length]} stopOpacity="0.3" />
            <stop offset="100%" stopColor={s.color || PALETTE[i % PALETTE.length]} stopOpacity="0.02" />
          </linearGradient>
        ))}
      </defs>
      <g className="chart-grid">
        {ticks.map((t) => (
          <line key={t} x1={pad.l} x2={w - pad.r} y1={pad.t + innerH * (1 - t)} y2={pad.t + innerH * (1 - t)} />
        ))}
      </g>
      {ticks.map((t) => (
        <text key={`y${t}`} className="chart-axis" x={pad.l - 8} y={pad.t + innerH * (1 - t) + 4} textAnchor="end">
          {Math.round(max * t)}
        </text>
      ))}
      {series.map((s, si) => {
        const color = s.color || PALETTE[si % PALETTE.length];
        const pts = data.map((d, i) => `${x(i)},${y(d[s.key])}`).join(' ');
        const areaPath = data.length
          ? `M ${x(0)},${pad.t + innerH} L ${data.map((d, i) => `${x(i)},${y(d[s.key])}`).join(' L ')} L ${x(data.length - 1)},${pad.t + innerH} Z`
          : '';
        return (
          <g key={s.key}>
            {showArea && areaPath && <path d={areaPath} fill={`url(#lg-${si}-${s.key})`} />}
            <polyline points={pts} fill="none" stroke={color} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
            {data.map((d, i) => (
              <circle key={i} cx={x(i)} cy={y(d[s.key])} r={data.length > 16 ? 1.8 : 3} fill={color}>
                <title>{`${d.label || d[s.key]}: ${d[s.key]}`}</title>
              </circle>
            ))}
          </g>
        );
      })}
      {data.map((d, i) => {
        const step = Math.ceil(data.length / 8);
        if (i % step !== 0 && i !== data.length - 1) return null;
        return (
          <text key={`x${i}`} className="chart-axis" x={x(i)} y={h - 8} textAnchor="middle">
            {d.label ?? d.x ?? i + 1}
          </text>
        );
      })}
    </svg>
  );
}

export function BarChart({ data = [], series = [], height = 230, yLabel }) {
  const w = 760;
  const h = height;
  const pad = { l: 42, r: 14, t: 16, b: 30 };
  const max = Math.max(1, ...data.flatMap((d) => series.map((s) => Number(d[s.key]) || 0))) * 1.15;
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  const groupW = innerW / Math.max(1, data.length);
  const barW = Math.min(26, (groupW * 0.68) / Math.max(1, series.length));

  return (
    <svg className="chart" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={yLabel || 'Bar chart'} preserveAspectRatio="none">
      <g className="chart-grid">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <line key={t} x1={pad.l} x2={w - pad.r} y1={pad.t + innerH * (1 - t)} y2={pad.t + innerH * (1 - t)} />
        ))}
      </g>
      {[0, 0.5, 1].map((t) => (
        <text key={`y${t}`} className="chart-axis" x={pad.l - 8} y={pad.t + innerH * (1 - t) + 4} textAnchor="end">
          {Math.round(max * t)}
        </text>
      ))}
      {data.map((d, i) => {
        const gx = pad.l + i * groupW;
        return (
          <g key={i}>
            {series.map((s, si) => {
              const v = Number(d[s.key]) || 0;
              const bh = (v / max) * innerH;
              const bw = barW;
              const offset = (groupW - bw * series.length - 3 * (series.length - 1)) / 2;
              return (
                <rect
                  key={s.key}
                  x={gx + offset + si * (bw + 3)}
                  y={pad.t + innerH - bh}
                  width={bw}
                  height={Math.max(bh, v > 0 ? 2 : 0)}
                  rx="4"
                  fill={s.color || PALETTE[si % PALETTE.length]}
                  opacity="0.92"
                >
                  <title>{`${s.label || s.key}: ${v}`}</title>
                </rect>
              );
            })}
            <text className="chart-axis" x={gx + groupW / 2} y={h - 9} textAnchor="middle">
              {d.label ?? d.x ?? i + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function Donut({ items = [], size = 190, thickness = 22, centerLabel, centerValue }) {
  const total = items.reduce((s, i) => s + (Number(i.value) || 0), 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="row" style={{ gap: 18, flexWrap: 'wrap', justifyContent: 'center' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Distribution">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line-soft)" strokeWidth={thickness} />
          {items.map((it, i) => {
            const val = Number(it.value) || 0;
            const len = total > 0 ? (val / total) * c : 0;
            const el = (
              <circle
                key={it.label || i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={it.color || PALETTE[i % PALETTE.length]}
                strokeWidth={thickness}
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              >
                <title>{`${it.label}: ${val}`}</title>
              </circle>
            );
            offset += len;
            return el;
          })}
        </g>
        <text x="50%" y="47%" textAnchor="middle" style={{ fontSize: 24, fontWeight: 800, fill: 'var(--text)' }}>
          {centerValue ?? total}
        </text>
        <text x="50%" y="61%" textAnchor="middle" style={{ fontSize: 10.5, fill: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
          {centerLabel || 'Total'}
        </text>
      </svg>
      <div className="col" style={{ gap: 7, minWidth: 130 }}>
        {items.map((it, i) => (
          <div key={it.label || i} className="legend-item">
            <span className="legend-dot" style={{ background: it.color || PALETTE[i % PALETTE.length] }} />
            <span className="small grow">{it.label}</span>
            <b className="small">{it.value}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HBar({ items = [], max, color = '#2589D8' }) {
  const top = max || Math.max(1, ...items.map((i) => Number(i.value) || 0));
  return (
    <div className="col" style={{ gap: 11 }}>
      {items.map((it, i) => (
        <div key={it.label || i}>
          <div className="between small">
            <span className="ellipsis">{it.label}</span>
            <b>{it.value}</b>
          </div>
          <div className="progress" style={{ height: 7 }}>
            <i style={{ width: `${((Number(it.value) || 0) / top) * 100}%`, background: it.color || color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

const bandColor = (score) => (score >= 16 ? '#B02434' : score >= 10 ? '#DC3545' : score >= 5 ? '#FF7900' : '#16A36A');

export function RiskMatrix({ counts = {}, onCell }) {
  const rows = [5, 4, 3, 2, 1];
  const cols = [1, 2, 3, 4, 5];
  return (
    <div>
      <div className="row" style={{ alignItems: 'stretch', gap: 8 }}>
        <div className="tiny muted" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', textAlign: 'center' }}>SEVERITY →</div>
        <div style={{ flex: 1 }}>
          {rows.map((s) => (
            <div key={s} className="row" style={{ gap: 4, marginBottom: 4 }}>
              <span className="tiny muted" style={{ width: 12, textAlign: 'right' }}>{s}</span>
              <div className="matrix" style={{ flex: 1 }}>
                {cols.map((l) => {
                  const score = s * l;
                  const key = `${s}-${l}`;
                  return (
                    <div
                      key={key}
                      className="matrix-cell"
                      style={{ background: bandColor(score), opacity: counts[key] ? 1 : 0.34, cursor: onCell ? 'pointer' : 'default' }}
                      onClick={onCell ? () => onCell(s, l) : undefined}
                      title={`Severity ${s} × Likelihood ${l} = ${score}`}
                    >
                      {counts[key] || score}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="row" style={{ gap: 4, marginTop: 2 }}>
            <span style={{ width: 12 }} />
            <div className="matrix" style={{ flex: 1 }}>
              {cols.map((l) => (
                <div key={l} className="tiny muted center">{l}</div>
              ))}
            </div>
          </div>
          <div className="tiny muted center mt-1">LIKELIHOOD →</div>
        </div>
      </div>
      <div className="legend mt-2">
        <span className="legend-item"><span className="legend-dot" style={{ background: '#16A36A' }} />Low (1–4)</span>
        <span className="legend-item"><span className="legend-dot" style={{ background: '#FF7900' }} />Medium (5–9)</span>
        <span className="legend-item"><span className="legend-dot" style={{ background: '#DC3545' }} />High (10–15)</span>
        <span className="legend-item"><span className="legend-dot" style={{ background: '#B02434' }} />Critical (16–25)</span>
      </div>
    </div>
  );
}

export function Sparkline({ values = [], color = '#2589D8', height = 40 }) {
  const w = 160;
  const h = height;
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const pts = values.map((v, i) => `${(i / Math.max(1, values.length - 1)) * w},${h - ((v - min) / Math.max(1, max - min)) * (h - 4) - 2}`);
  return (
    <svg className="sparkline" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export { PALETTE };
