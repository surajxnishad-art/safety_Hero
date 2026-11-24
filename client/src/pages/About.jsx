import React from 'react';
import { Link } from 'react-router-dom';
import { CONTACT } from '../components/Layout.jsx';

export default function About() {
  return (
    <div className="container narrow page-pad">
      <span className="pill">About the platform</span>
      <h1>Suraj Safety Hero</h1>
      <p className="lead">
        An industrial safety knowledge and career platform built for the people who keep plants, sites and projects
        safe every day — safety officers, HSE engineers, supervisors, contractors and managers.
      </p>

      <div className="grid cols-2 mt-3">
        <div className="card"><div className="card-body">
          <h3>Why it exists</h3>
          <p className="small muted">
            HSE teams juggle registers, permits, inspections, training matrices and compliance evidence across
            spreadsheets. Suraj Safety Hero brings those records into one system with real relationships, approvals,
            audit trails and reporting — so a safety officer can prove what happened, when, and who approved it.
          </p>
        </div></div>
        <div className="card"><div className="card-body">
          <h3>How it is built</h3>
          <p className="small muted">
            A relational database stores every record. Role-based access decides who can read, write and approve.
            Documents carry numbering, revisions and signatures. The AI assistant drafts content for review and is
            never treated as an approval authority.
          </p>
        </div></div>
      </div>

      <h2 className="mt-4">What is inside</h2>
      <div className="grid cols-3 mt-2">
        {[
          ['24 HSE modules', 'HIRA, JSA, permits, LOTO, incidents, CAPA, inspections, PPE, training, environment, health, contractors, MOC, lifting and more.'],
          ['Document library', 'Editable templates with automatic numbering, revision control, sign-offs and PDF/Word/Excel export.'],
          ['Analytics', 'LTIFR, TRIR, severity rate, compliance and trends computed from recorded data with published formulas.'],
          ['Safety job portal', 'India-wide safety vacancies with filters, saved jobs and application tracking.'],
          ['AI Safety Hero', 'Drafting and Q&A in English and Hindi, with clear review requirements.'],
          ['Admin control center', 'Users, roles, projects, sites, documents, enquiries, audit logs, backups and system settings.']
        ].map(([t, d]) => (
          <div className="feature" key={t}>
            <h3>{t}</h3>
            <p className="small muted">{d}</p>
          </div>
        ))}
      </div>

      <div className="card mt-4"><div className="card-body">
        <h3>Owner &amp; contact</h3>
        <p className="small muted">
          Suraj Safety Hero · Industrial Safety Knowledge &amp; Career Platform · {CONTACT.tagline}
        </p>
        <div className="row gap-sm wrap mt-2">
          <a className="btn btn-outline" href={`tel:${CONTACT.phone}`}>Call {CONTACT.phone}</a>
          <a className="btn btn-outline" href={`https://wa.me/91${CONTACT.phone}`} target="_blank" rel="noreferrer">WhatsApp</a>
          <a className="btn btn-outline" href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
        </div>
      </div></div>

      <p className="small muted mt-3">
        Safety, legal and technical content supports professional judgement. It must be reviewed by a qualified
        competent person and adapted to site conditions before use. It is not a substitute for statutory approval.
      </p>
      <Link className="btn btn-primary mt-2" to="/register">Create your workspace</Link>
    </div>
  );
}
