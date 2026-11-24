import React, { useState } from 'react';
import { CONTACT } from '../components/Layout.jsx';
import { Button, Card, ErrorNote, Field, useToast } from '../components/ui.jsx';
import { post } from '../lib/api.js';

const TYPES = [
  ['general', 'General enquiry'],
  ['career', 'Career enquiry'],
  ['job', 'Safety job enquiry'],
  ['resume', 'Resume submission'],
  ['support', 'Platform support']
];

export default function Contact() {
  const toast = useToast();
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', type: 'general', message: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await post('/api/contact', form);
      setDone(res.message);
      toast.push('Enquiry recorded — the team will review it.');
      setForm({ name: '', email: '', phone: '', subject: '', type: form.type, message: '' });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container page-pad">
      <span className="pill">Contact us</span>
      <h1>Talk to Suraj Safety Hero</h1>
      <p className="lead">Career enquiries, safety job submissions, platform support or partnership questions.</p>

      <div className="split mt-3">
        <Card title="Send a message">
          {done && <div className="notice success">{done}</div>}
          <ErrorNote error={error} />
          <form onSubmit={submit} className="col gap-md mt-2">
            <div className="grid cols-2" style={{ gap: 12 }}>
              <Field label="Full name *">
                <input value={form.name} onChange={set('name')} required minLength={2} placeholder="Your name" />
              </Field>
              <Field label="Email *">
                <input type="email" value={form.email} onChange={set('email')} required placeholder="you@company.com" />
              </Field>
              <Field label="Phone / WhatsApp">
                <input value={form.phone} onChange={set('phone')} placeholder="10-digit mobile" />
              </Field>
              <Field label="Enquiry type">
                <select value={form.type} onChange={set('type')}>
                  {TYPES.map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Subject">
              <input value={form.subject} onChange={set('subject')} placeholder="Short subject" />
            </Field>
            <Field label="Message *" hint="At least 10 characters. Do not include medical details or passwords.">
              <textarea rows={6} value={form.message} onChange={set('message')} required minLength={10} placeholder="How can we help?" />
            </Field>
            <div className="row gap-sm wrap">
              <Button variant="primary" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Submit enquiry'}</Button>
              <a className="btn btn-outline" href={`https://wa.me/91${CONTACT.phone}`} target="_blank" rel="noreferrer">WhatsApp instead</a>
            </div>
          </form>
        </Card>

        <div className="col gap-md">
          <Card title="Owner contact">
            <div className="col gap-sm">
              <a className="contact-row" href={`tel:${CONTACT.phone}`}>
                <span className="feature-icon sm" aria-hidden="true">📞</span>
                <span><b>{CONTACT.phone}</b><br /><span className="tiny muted">Call now</span></span>
              </a>
              <a className="contact-row" href={`https://wa.me/91${CONTACT.phone}`} target="_blank" rel="noreferrer">
                <span className="feature-icon sm" aria-hidden="true">💬</span>
                <span><b>WhatsApp</b><br /><span className="tiny muted">Message the owner</span></span>
              </a>
              <a className="contact-row" href={`mailto:${CONTACT.email}`}>
                <span className="feature-icon sm" aria-hidden="true">✉</span>
                <span><b>{CONTACT.email}</b><br /><span className="tiny muted">Email</span></span>
              </a>
            </div>
          </Card>
          <Card title="Resume submission">
            <p className="small muted">
              Send your CV with the role you are targeting and your current location. Use enquiry type
              “Resume submission”. Only genuine requirements are published on the job board.
            </p>
          </Card>
          <div className="notice">
            <b>Privacy.</b> Enquiries are stored in the platform database and visible only to administrators. Never send
            passwords, medical records or identity documents through this form.
          </div>
        </div>
      </div>
    </div>
  );
}
