import React from 'react';
import { Link } from 'react-router-dom';
import { CONTACT } from '../components/Layout.jsx';
import { useApi, fmt } from '../lib/data.js';

const PILLARS = [
  { icon: '⚠', title: 'HIRA & Risk Register', text: 'Hazard identification, 5×5 risk matrix, hierarchy of controls and residual risk approval.' },
  { icon: '🔒', title: 'Permit to Work & LOTO', text: '12 permit types with isolation verification, gas tests, signatures and expiry alerts.' },
  { icon: '🚨', title: 'Incident & CAPA', text: 'Report, investigate, root cause with 5-Why and Fishbone, then close the loop.' },
  { icon: '🔍', title: 'Inspection & Audit', text: 'Daily to ISO audits with findings, compliance scoring and action tracking.' },
  { icon: '🎓', title: 'Training & Competency', text: 'Induction, toolbox talks, certificates and automatic expiry reminders.' },
  { icon: '🌱', title: 'Environment & Health', text: 'Aspects and impacts, waste, monitoring plus restricted medical records.' }
];

export default function Home() {
  const { data } = useApi('/api/summary');
  const stats = data?.stats || {};
  const aiOn = data?.ai?.enabled;

  return (
    <div>
      <section className="hero">
        <div className="container hero-inner">
          <div className="hero-copy">
            <span className="pill">SURAJ SAFETY HERO V2.0</span>
            <h1>
              Industrial Safety &amp; HSE management, <span className="grad">engineered for zero harm</span>
            </h1>
            <p className="lead">
              One connected platform for safety officers, HSE managers, contractors and site teams — risk assessment,
              permits, incidents, inspections, training, PPE, environment and compliance, with an AI safety assistant
              that drafts the paperwork you review and approve.
            </p>
            <div className="row gap-sm wrap mt-3">
              <Link className="btn btn-primary btn-lg" to="/register">Create your workspace</Link>
              <Link className="btn btn-outline btn-lg" to="/login">Sign in</Link>
            </div>
            <div className="hero-trust">
              <span>🛡 Role-based access</span>
              <span>📄 Auditable documents</span>
              <span>🤖 AI drafting</span>
            </div>
          </div>

          <div className="hero-card">
            <div className="hero-card-head">
              <span className="dot-live" /> Live HSE snapshot
            </div>
            <div className="hero-metrics">
              <div><b>{fmt(stats.modules)}</b><span>HSE modules</span></div>
              <div><b>{fmt(stats.templates)}</b><span>Document templates</span></div>
              <div><b>{fmt(stats.records)}</b><span>Stored records</span></div>
              <div><b>{fmt(stats.published_jobs)}</b><span>Safety vacancies</span></div>
            </div>
            <div className="hero-bars">
              <div className="hero-bar"><span>Risk register</span><i style={{ width: '82%' }} /></div>
              <div className="hero-bar"><span>Permit control</span><i style={{ width: '68%' }} /></div>
              <div className="hero-bar"><span>Training compliance</span><i style={{ width: '91%' }} /></div>
              <div className="hero-bar"><span>CAPA closure</span><i style={{ width: '74%' }} /></div>
            </div>
            <div className="hero-note small">
              {aiOn ? 'AI assistant connected — drafts require competent-person review.' : 'AI assistant available in template mode — connect a provider key to enable live model output.'}
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>Everything an HSE department runs on</h2>
            <p className="muted">24 connected modules, one database, one audit trail.</p>
          </div>
          <div className="grid cols-3">
            {PILLARS.map((p) => (
              <div className="feature" key={p.title}>
                <div className="feature-icon" aria-hidden="true">{p.icon}</div>
                <h3>{p.title}</h3>
                <p className="small muted">{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section alt">
        <div className="container split">
          <div>
            <h2>AI Safety Hero drafts, you decide</h2>
            <p className="muted">
              Ask any industrial safety question, or generate a JSA, HIRA, method statement, SOP, toolbox talk,
              inspection checklist, investigation report or monthly HSE report in seconds. Every output is marked as a
              draft: it never authorises work, never certifies compliance, and always needs a qualified competent person.
            </p>
            <ul className="ticks">
              <li>Hindi and English support</li>
              <li>Context-aware, asks for missing site details</li>
              <li>Export to PDF, Word and Excel</li>
            </ul>
            <Link className="btn btn-primary mt-2" to="/login">Open the AI assistant</Link>
          </div>
          <div className="chat-preview">
            <div className="bubble user">Generate a JSA for hot work on a live hydrocarbon line.</div>
            <div className="bubble ai">
              Draft prepared. I need three details before this is usable: line isolation status, gas test results, and the
              fire watch arrangement. Here is the step-by-step JSA skeleton with controls and required PPE…
            </div>
            <div className="bubble user">Translate the control measures to Hindi.</div>
            <div className="bubble ai">नियंत्रण उपाय: गैस परीक्षण, अग्नि-निगरानी, उपयुक्त PPE और अनुमति-आधारित कार्य…</div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="cta">
            <div>
              <h2>Ready to run safety on real records?</h2>
              <p>Create your workspace, invite your team, and start with the modules you need today.</p>
            </div>
            <div className="row gap-sm wrap">
              <Link className="btn btn-primary btn-lg" to="/register">Get started free</Link>
              <a className="btn btn-outline btn-lg" href={`tel:${CONTACT.phone}`}>Call {CONTACT.phone}</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
