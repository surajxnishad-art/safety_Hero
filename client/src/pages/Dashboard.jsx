import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, DataTable, Empty, Loading, Progress, Stat, Badge } from '../components/ui.jsx';
import { BarChart, Donut, HBar, LineChart, PALETTE } from '../components/charts.jsx';
import { useApi, fmt, dateFmt } from '../lib/data.js';
import { useAuth } from '../lib/auth.jsx';

const pctTone = (v) => (v >= 95 ? 'good' : v >= 80 ? 'warn' : 'bad');

export default function Dashboard() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useApi('/api/dashboard');

  const k = data?.kpis || {};
  const monthly = data?.monthly || [];
  const expiries = data?.expiries || {};
  const projects = data?.projects || [];
  const recent = data?.recent || [];
  const formulas = data?.formulas || {};

  const riskBands = useMemo(() => {
    const bands = data?.risk?.bands || data?.risk_bands || [];
    return Array.isArray(bands) ? bands : [];
  }, [data]);

  const permitStatus = data?.permits?.by_status || data?.permit_status || [];

  if (loading && !data) return <Loading label="Building your HSE picture…" />;

  const kpiCards = [
    ['Man-hours worked', fmt(k.man_hours), 'exposure', '⏱'],
    ['Safe man-hours', fmt(k.safe_man_hours), 'good', '🛡'],
    ['Total incidents', fmt(k.total_incidents), k.total_incidents ? 'bad' : 'good', '🚨'],
    ['Near misses', fmt(k.near_misses), 'warn', '👁'],
    ['Lost time injuries', fmt(k.lost_time_injuries), k.lost_time_injuries ? 'bad' : 'good', '🩹'],
    ['LTIFR', fmt(k.ltifr, 2), 'info', '📉'],
    ['TRIR', fmt(k.trir, 2), 'info', '📊'],
    ['Severity rate', fmt(k.severity_rate, 2), 'info', '⚖'],
    ['Open CAPA', fmt(k.capa_open), k.capa_open ? 'warn' : 'good', '🔁'],
    ['CAPA closure', `${fmt(k.capa_closure_rate, 1)}%`, pctTone(k.capa_closure_rate), '✅'],
    ['Training compliance', `${fmt(k.training_compliance, 1)}%`, pctTone(k.training_compliance), '🎓'],
    ['PPE compliance', `${fmt(k.ppe_compliance, 1)}%`, pctTone(k.ppe_compliance), '🦺'],
    ['Inspection compliance', `${fmt(k.inspection_compliance, 1)}%`, pctTone(k.inspection_compliance), '🔍'],
    ['Workforce', fmt(k.employees + k.contractors), 'info', '👷']
  ];

  return (
    <div className="col gap-lg">
      <header className="page-head">
        <div>
          <h1>HSE Dashboard</h1>
          <p className="muted small">
            Welcome back, {user?.name?.split(' ')[0] || 'safety professional'} · every figure is calculated from stored records
            {data?.generated_at ? ` · updated ${new Date(data.generated_at).toLocaleTimeString('en-GB')}` : ''}
          </p>
        </div>
        <div className="row gap-sm wrap">
          {data?.demo_data && <span className="pill warn">Demo dataset — replace with live site records</span>}
          <button className="btn btn-outline btn-sm" onClick={reload} type="button">Refresh</button>
        </div>
      </header>

      {error && <div className="form-error">{error.message}</div>}

      <div className="stat-grid">
        {kpiCards.map(([label, value, tone, icon]) => (
          <Stat key={label} label={label} value={value} tone={tone} icon={icon} />
        ))}
      </div>

      <div className="grid cols-2">
        <Card title="Incidents & observations" subtitle="Last 12 months">
          {monthly.length ? (
            <LineChart
              data={monthly}
              series={[
                { key: 'incidents', label: 'Incidents', color: '#DC3545' },
                { key: 'observations', label: 'Observations', color: '#2589D8' }
              ]}
              yLabel="Count"
            />
          ) : (
            <Empty icon="📈" title="No trend data yet" text="Record incidents and observations to see the trend." />
          )}
        </Card>

        <Card title="Man-hours exposure" subtitle="Hours worked per month">
          {monthly.length ? (
            <BarChart
              data={monthly}
              series={[{ key: 'man_hours', label: 'Man-hours', color: '#1769AA' }]}
              yLabel="Hours"
            />
          ) : (
            <Empty icon="⏱" title="No man-hours recorded" text="Add monthly man-hours in the Man-hours register." />
          )}
        </Card>
      </div>

      <div className="grid cols-3">
        <Card title="Risk profile" subtitle="Register by risk band">
          {riskBands.length ? (
            <Donut
              items={riskBands.map((b) => ({ label: b.band || b.name, value: b.c ?? b.count, color: undefined }))}
              centerLabel="Risks"
              centerValue={fmt(k.hazard_reports)}
            />
          ) : (
            <Empty icon="⚠" title="No risks rated" text="Create HIRA entries to populate the risk profile." />
          )}
        </Card>

        <Card title="Permit status" subtitle="Live permits by state">
          {permitStatus.length ? (
            <HBar items={permitStatus.map((p) => ({ label: p.status, value: p.c ?? p.count }))} />
          ) : (
            <Empty icon="📄" title="No permits yet" text="Raise a permit to work to see status here." />
          )}
        </Card>

        <Card title="Expiring in 30 days" subtitle="Automatic alert sources">
          <div className="col gap-sm">
            {Object.entries(expiries).map(([key, value]) => (
              <div className="row between" key={key}>
                <span className="small muted" style={{ textTransform: 'capitalize' }}>{key}</span>
                <Badge status={value > 0 ? 'pending' : 'completed'}>{value}</Badge>
              </div>
            ))}
            {Object.keys(expiries).length === 0 && <p className="small muted">No expiry data yet.</p>}
          </div>
        </Card>
      </div>

      <div className="grid cols-2">
        <Card title="Project safety performance" subtitle="Compliance, incidents and open actions">
          <DataTable
            columns={[
              { key: 'name', label: 'Project', render: (r) => (<div><b>{r.name}</b><div className="tiny muted">{r.code} · {r.location || r.state || '—'}</div></div>) },
              { key: 'compliance', label: 'Compliance', render: (r) => <Progress value={r.compliance} tone={pctTone(r.compliance)} /> },
              { key: 'incidents', label: 'Incidents' },
              { key: 'open_capa', label: 'Open CAPA' }
            ]}
            rows={projects}
            empty={<Empty icon="🏗" title="No projects" text="Create a project in the admin center." />}
          />
        </Card>

        <Card title="Recent activity" subtitle="Audit trail">
          <div className="col gap-sm">
            {recent.length === 0 && <p className="small muted">No activity recorded yet.</p>}
            {recent.map((r, i) => (
              <div className="activity" key={i}>
                <span className="dot" />
                <div>
                  <div className="small"><b>{r.action}</b> {r.entity ? `· ${r.entity}` : ''}</div>
                  <div className="tiny muted">
                    {r.user_email || 'system'} · {r.created_at ? new Date(r.created_at).toLocaleString('en-GB') : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="How these numbers are calculated" subtitle="Published formulas — verify against your own reporting standard">
        <div className="grid cols-3">
          {Object.entries(formulas).map(([name, formula]) => (
            <div key={name} className="formula">
              <div className="small"><b>{name.replace(/_/g, ' ').toUpperCase()}</b></div>
              <div className="tiny muted">{formula}</div>
            </div>
          ))}
        </div>
        <p className="tiny muted mt-2">
          Metrics use recorded man-hours and injury classifications. Confirm your classification rules (for example what
          counts as a recordable injury) with your competent person before publishing external reports.
        </p>
      </Card>

      <div className="row gap-sm wrap">
        <Link className="btn btn-primary" to="/modules">Open HSE modules</Link>
        <Link className="btn btn-outline" to="/ai">Ask AI Safety Hero</Link>
        <Link className="btn btn-outline" to="/documents">Document library</Link>
      </div>
    </div>
  );
}
