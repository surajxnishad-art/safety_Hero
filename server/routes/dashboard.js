import { Router } from 'express';
import { db, getSetting } from '../db.js';

const router = Router();
const n = (v) => Number(v) || 0;
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);

const today = new Date().toISOString().slice(0, 10);
const daysFromNow = (d) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);

router.get('/', (req, res) => {
  /* ---------------------------- exposure & man-hours ---------------------------- */
  const hours = db.prepare('SELECT COALESCE(SUM(hours_worked),0) h, COALESCE(SUM(safe_hours),0) s FROM manhours').get();
  const latest = db.prepare('SELECT * FROM manhours ORDER BY month DESC LIMIT 1').get();
  const totalHours = n(hours.h);
  const safeHours = n(hours.s);

  /* ------------------------------- incident counts ------------------------------ */
  const incidentRows = db
    .prepare("SELECT COALESCE(incident_type,'Unclassified') type, COUNT(*) c, COALESCE(SUM(lost_days),0) days FROM incidents GROUP BY type")
    .all();
  const countMatching = (...needles) =>
    incidentRows
      .filter((r) => needles.some((needle) => String(r.type).toLowerCase().includes(needle)))
      .reduce((sum, r) => sum + r.c, 0);

  const nearMiss = countMatching('near miss', 'near-miss');
  const firstAid = countMatching('first aid');
  const mtc = countMatching('medical treatment');
  const lti = countMatching('lost time');
  const fatalities = countMatching('fatal');
  const propertyDamage = countMatching('property');
  const fireIncidents = countMatching('fire');
  const environmental = countMatching('environment');
  const recordable = lti + mtc + fatalities;
  const lostDays = incidentRows.reduce((s, r) => s + n(r.days), 0);
  const totalIncidents = incidentRows.reduce((s, r) => s + r.c, 0);

  /* ------------------------- observations / unsafe acts ------------------------- */
  const observationRows = db
    .prepare("SELECT COALESCE(observation_type,'Unclassified') type, COUNT(*) c FROM observations GROUP BY type")
    .all();
  const obsCount = (...needles) =>
    observationRows.filter((r) => needles.some((x) => String(r.type).toLowerCase().includes(x))).reduce((s, r) => s + r.c, 0);
  const unsafeActs = obsCount('unsafe act');
  const unsafeConditions = obsCount('unsafe condition');
  const totalObservations = observationRows.reduce((s, r) => s + r.c, 0);

  /* --------------------------------- CAPA status -------------------------------- */
  const capaRows = db.prepare('SELECT status, COUNT(*) c FROM capa_records GROUP BY status').all();
  const capaTotal = capaRows.reduce((s, r) => s + r.c, 0);
  const capaClosed = capaRows.filter((r) => ['closed', 'verified'].includes(String(r.status))).reduce((s, r) => s + r.c, 0);
  const capaOverdue = db
    .prepare("SELECT COUNT(*) c FROM capa_records WHERE status NOT IN ('closed','rejected') AND due_date IS NOT NULL AND due_date < ?")
    .get(today).c;

  /* ------------------------------ compliance rates ------------------------------ */
  const insp = db.prepare('SELECT COUNT(*) c, COALESCE(AVG(compliance_pct),0) avg, COALESCE(SUM(critical_findings),0) crit FROM inspections').get();
  const trainingTotal = db.prepare('SELECT COUNT(*) c FROM training_records').get().c;
  const trainingValid = db
    .prepare("SELECT COUNT(*) c FROM training_records WHERE expiry_date IS NULL OR expiry_date >= ?")
    .get(today).c;
  const ppeTotal = db.prepare('SELECT COUNT(*) c FROM ppe_records').get().c;
  const ppeValid = db
    .prepare("SELECT COUNT(*) c FROM ppe_records WHERE condition IS NULL OR LOWER(condition) NOT IN ('damaged','rejected','expired','poor')")
    .get().c;

  const kpis = {
    employees: latest ? n(latest.employees_count) : db.prepare('SELECT COUNT(*) c FROM employee_records').get().c,
    contractors: latest ? n(latest.contractors_count) : db.prepare('SELECT COUNT(*) c FROM contractor_records').get().c,
    man_hours: totalHours,
    safe_man_hours: safeHours,
    total_incidents: totalIncidents,
    near_misses: nearMiss,
    first_aid_cases: firstAid,
    medical_treatment_cases: mtc,
    lost_time_injuries: lti,
    fatalities,
    property_damage: propertyDamage,
    fire_incidents: fireIncidents,
    environmental_incidents: environmental,
    unsafe_acts: unsafeActs,
    unsafe_conditions: unsafeConditions,
    safety_observations: totalObservations,
    capa_open: capaTotal - capaClosed,
    capa_closed: capaClosed,
    capa_overdue: capaOverdue,
    capa_closure_rate: pct(capaClosed, capaTotal),
    inspections: insp.c,
    inspection_compliance: Math.round(n(insp.avg) * 10) / 10,
    critical_findings: n(insp.crit),
    training_compliance: pct(trainingValid, trainingTotal),
    ppe_compliance: pct(ppeValid, ppeTotal),
    ltifr: totalHours > 0 ? Math.round(((lti * 1_000_000) / totalHours) * 100) / 100 : 0,
    trir: totalHours > 0 ? Math.round(((recordable * 200_000) / totalHours) * 100) / 100 : 0,
    severity_rate: totalHours > 0 ? Math.round(((lostDays * 1_000_000) / totalHours) * 100) / 100 : 0,
    lost_days: lostDays,
    recordable_injuries: recordable,
    hazard_reports: totalObservations + nearMiss
  };

  /* ------------------------------- 12-month series ------------------------------ */
  const months = [];
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    months.push(d.toISOString().slice(0, 7));
  }
  const mhByMonth = new Map(db.prepare('SELECT month, COALESCE(SUM(hours_worked),0) h, COALESCE(SUM(safe_hours),0) s FROM manhours GROUP BY month').all().map((r) => [r.month, r]));
  const incByMonth = db
    .prepare("SELECT substr(incident_date,1,7) m, COUNT(*) c, COALESCE(SUM(lost_days),0) d FROM incidents GROUP BY m")
    .all();
  const incMap = new Map(incByMonth.map((r) => [r.m, r]));
  const obsByMonth = new Map(
    db.prepare("SELECT substr(observation_date,1,7) m, COUNT(*) c FROM observations GROUP BY m").all().map((r) => [r.m, r.c])
  );
  const capaByMonth = new Map(
    db.prepare("SELECT substr(closed_date,1,7) m, COUNT(*) c FROM capa_records WHERE closed_date IS NOT NULL GROUP BY m").all().map((r) => [r.m, r.c])
  );

  const monthly = months.map((m) => {
    const mh = mhByMonth.get(m);
    const inc = incMap.get(m);
    const hoursM = mh ? n(mh.h) : 0;
    return {
      month: m,
      label: new Date(`${m}-01T00:00:00Z`).toLocaleString('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' }),
      man_hours: hoursM,
      safe_hours: mh ? n(mh.s) : 0,
      incidents: inc ? inc.c : 0,
      lost_days: inc ? n(inc.d) : 0,
      observations: obsByMonth.get(m) || 0,
      capa_closed: capaByMonth.get(m) || 0,
      ltifr: hoursM > 0 ? Math.round(((inc ? inc.c : 0) * 1_000_000) / hoursM * 100) / 100 : 0
    };
  });

  /* --------------------------------- risk register ------------------------------ */
  const riskBands = db.prepare("SELECT COALESCE(risk_band,'Unrated') band, COUNT(*) c FROM hira_risks GROUP BY band").all();
  const riskTotal = riskBands.reduce((s, r) => s + r.c, 0);
  const topHazards = db
    .prepare('SELECT activity, hazard, initial_risk, risk_band FROM hira_risks WHERE initial_risk IS NOT NULL ORDER BY initial_risk DESC LIMIT 6')
    .all();

  /* --------------------------------- permit status ------------------------------ */
  const permitRows = db.prepare('SELECT status, COUNT(*) c FROM permits GROUP BY status').all();
  const permitActive = permitRows.filter((r) => String(r.status) === 'active').reduce((s, r) => s + r.c, 0);
  const permitExpiring = db
    .prepare("SELECT COUNT(*) c FROM permits WHERE status = 'active' AND valid_to IS NOT NULL AND valid_to <= ?")
    .get(daysFromNow(7)).c;

  /* ------------------------------- project roll-up ------------------------------ */
  const projects = db
    .prepare(
      `SELECT p.id, p.name, p.code, p.location, p.state,
        (SELECT COUNT(*) FROM incidents i WHERE i.project_id = p.id) incidents,
        (SELECT COUNT(*) FROM capa_records c WHERE c.project_id = p.id AND c.status NOT IN ('closed','rejected')) open_capa,
        (SELECT COALESCE(AVG(compliance_pct),0) FROM inspections s WHERE s.project_id = p.id) compliance
       FROM projects p ORDER BY p.id`
    )
    .all()
    .map((p) => ({ ...p, compliance: Math.round(n(p.compliance) * 10) / 10 }));

  /* ---------------------------------- expiries ---------------------------------- */
  const soon = daysFromNow(30);
  const expiries = {
    permits: db.prepare("SELECT COUNT(*) c FROM permits WHERE status = 'active' AND valid_to IS NOT NULL AND valid_to <= ?").get(soon).c,
    training: db.prepare('SELECT COUNT(*) c FROM training_records WHERE expiry_date IS NOT NULL AND expiry_date <= ?').get(soon).c,
    ppe: db.prepare('SELECT COUNT(*) c FROM ppe_records WHERE expiry_date IS NOT NULL AND expiry_date <= ?').get(soon).c,
    equipment: db.prepare('SELECT COUNT(*) c FROM equipment_records WHERE next_due IS NOT NULL AND next_due <= ?').get(soon).c,
    fire: db.prepare('SELECT COUNT(*) c FROM fire_equipment WHERE next_due IS NOT NULL AND next_due <= ?').get(soon).c,
    capa: db.prepare("SELECT COUNT(*) c FROM capa_records WHERE status NOT IN ('closed','rejected') AND due_date IS NOT NULL AND due_date <= ?").get(soon).c,
    inspections: db.prepare('SELECT COUNT(*) c FROM inspections WHERE next_due IS NOT NULL AND next_due <= ?').get(soon).c
  };

  const contractorScores = db
    .prepare('SELECT contractor_name, work_scope, workers_count, safety_score, evaluation_date FROM contractor_records ORDER BY safety_score DESC LIMIT 8')
    .all();

  const recent = db
    .prepare('SELECT action, entity, entity_id, details, created_at, user_email FROM audit_logs ORDER BY id DESC LIMIT 8')
    .all();

  res.json({
    generated_at: new Date().toISOString(),
    demo_data: getSetting('demo_data', '0') === '1',
    formulas: {
      ltifr: '(lost time injuries x 1,000,000) / total man-hours',
      trir: '(recordable injuries x 200,000) / total man-hours',
      severity_rate: '(lost days x 1,000,000) / total man-hours'
    },
    kpis,
    monthly,
    incident_types: incidentRows,
    observation_types: observationRows,
    capa_status: capaRows,
    risk_bands: riskBands,
    risk_total: riskTotal,
    top_hazards: topHazards,
    permits: { by_status: permitRows, active: permitActive, expiring_7d: permitExpiring },
    projects,
    expiries,
    contractor_scores: contractorScores,
    recent_activity: recent
  });
});

export default router;
