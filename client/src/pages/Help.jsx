import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { CONTACT } from '../components/Layout.jsx';

const FAQS = [
  ['What is Suraj Safety Hero?', 'A working HSE management platform: risk registers, permits, incidents, CAPA, inspections, training, PPE, environment, documents, analytics and a safety job portal — backed by a relational database and role-based access.'],
  ['Does the AI approve permits or certify compliance?', 'No. The AI assistant drafts content such as JSAs, HIRAs, method statements and reports. Every output is a draft that must be reviewed by a qualified competent person. It never authorises work and never certifies legal compliance.'],
  ['How do I create the first administrator?', 'On a fresh installation, open the login page. When no administrator exists, the page offers secure owner setup. After that, administrators create and manage all other accounts from the Admin Control Center.'],
  ['Who can see my project data?', 'Access is role-based and project-scoped. Contractors and general employees only see records for projects they are assigned to; HSE managers, officers and administrators see their permitted scope.'],
  ['How are LTIFR, TRIR and severity rate calculated?', 'LTIFR = (lost time injuries × 1,000,000) ÷ man-hours. TRIR = (recordable injuries × 200,000) ÷ man-hours. Severity rate = (lost days × 1,000,000) ÷ man-hours. The dashboard shows the formulas it uses.'],
  ['Can I export documents and registers?', 'Yes. Module registers export to CSV, and controlled documents export to print-ready PDF or HTML, with Word-compatible export where supported.'],
  ['Is my medical and health data private?', 'Occupational health records are restricted to authorised roles only and are excluded from general module visibility.'],
  ['How do I report a problem or request a feature?', `Use the contact form or email ${CONTACT.email}. Include your role, the module and what you expected to happen.`]
];

export default function Help() {
  const [open, setOpen] = useState(0);
  return (
    <div className="container narrow page-pad">
      <span className="pill">Help Center</span>
      <h1>How can we help?</h1>
      <p className="lead">Answers to the questions safety teams ask most, plus direct support from the owner.</p>

      <div className="card mt-3">
        <div className="card-body">
          {FAQS.map(([q, a], i) => (
            <div className={`faq${open === i ? ' open' : ''}`} key={q}>
              <button type="button" onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}>
                <span>{q}</span>
                <span aria-hidden="true">{open === i ? '−' : '+'}</span>
              </button>
              {open === i && <p className="small muted">{a}</p>}
            </div>
          ))}
        </div>
      </div>

      <div className="grid cols-3 mt-3">
        <div className="feature">
          <div className="feature-icon" aria-hidden="true">📞</div>
          <h3>Call the owner</h3>
          <p className="small muted">{CONTACT.phone}</p>
          <a className="btn btn-outline btn-sm" href={`tel:${CONTACT.phone}`}>Call now</a>
        </div>
        <div className="feature">
          <div className="feature-icon" aria-hidden="true">💬</div>
          <h3>WhatsApp</h3>
          <p className="small muted">Fastest for quick questions.</p>
          <a className="btn btn-outline btn-sm" href={`https://wa.me/91${CONTACT.phone}`} target="_blank" rel="noreferrer">Open WhatsApp</a>
        </div>
        <div className="feature">
          <div className="feature-icon" aria-hidden="true">✉</div>
          <h3>Email support</h3>
          <p className="small muted">{CONTACT.email}</p>
          <Link className="btn btn-outline btn-sm" to="/contact">Use the form</Link>
        </div>
      </div>

      <div className="notice mt-3">
        <b>Safety notice.</b> Content in this platform supports professional judgement. Legal references must be verified
        against the current gazette and your applicable state rules; safety procedures must be adapted to site conditions
        and approved by a competent person.
      </div>
    </div>
  );
}
