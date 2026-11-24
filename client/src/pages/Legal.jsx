import React from 'react';
import { CONTACT } from '../components/Layout.jsx';

function LegalShell({ title, updated, children }) {
  return (
    <div className="container narrow page-pad">
      <span className="pill">Legal</span>
      <h1>{title}</h1>
      <p className="small muted">Last updated: {updated}</p>
      <div className="card mt-2">
        <div className="card-body prose">{children}</div>
      </div>
    </div>
  );
}

export function Privacy() {
  return (
    <LegalShell title="Privacy Policy" updated="November 2026">
      <h3>What we collect</h3>
      <p>
        Account details you provide (name, email, phone, company, designation), safety records you create (inspections,
        incidents, permits, training, PPE, environment, health surveillance), documents you upload, and technical logs
        needed to keep the service secure (sign-in events, IP address, user agent, audit actions).
      </p>
      <h3>Why we process it</h3>
      <p>
        To operate your safety management system: authenticating users, storing and relating records, routing approvals,
        producing reports, sending in-app alerts, and maintaining an audit trail. Occupational health information is
        restricted to authorised roles and is not exposed to general module views.
      </p>
      <h3>Who can see it</h3>
      <p>
        Access is controlled by role and project scope. Administrators can manage accounts and settings. Contractors and
        employees only see records for projects they are assigned to. Uploaded medical records are limited to roles with
        health responsibilities.
      </p>
      <h3>AI processing</h3>
      <p>
        If a language-model provider is connected, the text you submit to the AI assistant is sent to that provider to
        generate a response. Do not submit personal medical details or confidential identifiers you are not authorised to
        share. Without a provider key, the assistant uses built-in template drafting and your text stays on the server.
      </p>
      <h3>Retention and backup</h3>
      <p>
        Records are retained for as long as your workspace exists. Administrators can export a database backup. Audit logs
        record who changed what and when.
      </p>
      <h3>Your choices</h3>
      <p>
        You can update your profile, change your password and request account deactivation. For data access, correction
        or deletion requests contact <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> or {CONTACT.phone}.
      </p>
      <h3>Security</h3>
      <p>
        Passwords are stored as salted hashes, sessions use HttpOnly cookies, sign-in attempts are rate limited, and
        privileged actions are written to an audit log. No system is perfectly secure; report suspected issues promptly.
      </p>
    </LegalShell>
  );
}

export function Terms() {
  return (
    <LegalShell title="Terms & Conditions" updated="November 2026">
      <h3>Purpose of the platform</h3>
      <p>
        Suraj Safety Hero is a safety management and knowledge platform. It helps organisations record, track and report
        HSE activity. It is not a statutory authority, a certifying body or a substitute for competent-person judgement.
      </p>
      <h3>No warranty of compliance</h3>
      <p>
        Templates, checklists, legal references and AI outputs are provided as drafting aids. You are responsible for
        verifying every legal citation against the current gazette and applicable state rules, adapting procedures to site
        conditions, and obtaining all statutory approvals. Nothing in this platform certifies compliance.
      </p>
      <h3>AI outputs</h3>
      <p>
        AI-generated content is a draft. It may be incomplete or inaccurate and must be reviewed, corrected and approved by
        a qualified competent person before use. AI output never authorises work, never closes a permit, and never
        replaces a signature.
      </p>
      <h3>Job listings</h3>
      <p>
        Vacancies are published from employer or administrator submissions. Listings are marked as unverified unless the
        source has been verified. We do not guarantee the accuracy of third-party listings and never charge candidates.
      </p>
      <h3>Acceptable use</h3>
      <p>
        Do not upload unlawful content, attempt to access records outside your permission, share credentials, or use the
        platform to harass or mislead. Accounts may be suspended for misuse.
      </p>
      <h3>Availability</h3>
      <p>
        The service is provided on a best-effort basis. Scheduled maintenance, provider limits or outages may interrupt
        access. Keep independent backups of records that are critical to your statutory obligations.
      </p>
      <h3>Contact</h3>
      <p>
        Suraj Safety Hero · {CONTACT.phone} · <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
      </p>
    </LegalShell>
  );
}
