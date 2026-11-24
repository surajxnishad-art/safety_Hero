/**
 * SURAJ SAFETY HERO - demo dataset.
 * Everything inserted here is real database content (clearly labelled as demo data
 * in the UI) so dashboards, KPIs and reports work from day one.
 */
import { db, nowIso, setSetting } from './db.js';
import { MODULES } from './registry.js';
import { TEMPLATES, renderTemplate } from './templates.js';

const iso = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => iso(new Date(Date.now() - n * 86400000));
const daysAhead = (n) => iso(new Date(Date.now() + n * 86400000));
const pick = (arr, i) => arr[i % arr.length];

function insertModule(key, rows) {
  const mod = MODULES.find((m) => m.key === key);
  if (!mod) return 0;
  const fieldNames = mod.fields.map((f) => f.name);
  const cols = ['ref_no', 'title', 'status', 'project_id', 'created_by', 'created_at', 'updated_at', ...fieldNames];
  const stmt = db.prepare(
    `INSERT INTO ${mod.table} (${cols.join(', ')}) VALUES (${cols.map((c) => `@${c}`).join(', ')})`
  );
  let count = 0;
  rows.forEach((row, index) => {
    const values = Object.fromEntries(cols.map((c) => [c, null]));
    values.ref_no = row.ref_no || `${mod.prefix}-${String(index + 1).padStart(4, '0')}`;
    values.title = row.title || '';
    values.status = row.status || 'approved';
    values.project_id = row.project_id || 1;
    values.created_at = nowIso();
    values.updated_at = nowIso();
    for (const field of mod.fields) {
      const value = row[field.name];
      values[field.name] = value === undefined ? null : value;
    }
    if (mod.derive) Object.assign(values, mod.derive(values));
    stmt.run(values);
    count += 1;
  });
  return count;
}

export function seedIfEmpty() {
  const already = db.prepare('SELECT COUNT(*) AS c FROM projects').get().c;
  if (already > 0) return { seeded: false };

  const now = nowIso();

  const projects = db.prepare(
    'INSERT INTO projects (name, code, client, location, state, start_date, end_date, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  projects.run('Greenfield Steel Plant Expansion', 'GSP-02', 'Industrial Client A', 'Angul, Odisha', 'Odisha', daysAgo(400), daysAhead(300), 'active', now);
  projects.run('Coastal Logistics Terminal – Phase 3', 'CLT-03', 'Industrial Client B', 'Mundra, Gujarat', 'Gujarat', daysAgo(260), daysAhead(420), 'active', now);
  projects.run('Refinery Turnaround 2026', 'RTA-26', 'Industrial Client C', 'Jamnagar, Gujarat', 'Gujarat', daysAgo(60), daysAhead(120), 'planning', now);

  const sites = db.prepare('INSERT INTO sites (project_id, name, location, site_type, created_at) VALUES (?, ?, ?, ?, ?)');
  sites.run(1, 'Unit-2 Fabrication Yard', 'Angul', 'Fabrication', now);
  sites.run(1, 'Blast Furnace Area', 'Angul', 'Process', now);
  sites.run(2, 'Berth 4 Construction', 'Mundra', 'Marine', now);
  sites.run(2, 'Warehouse Block A', 'Mundra', 'Logistics', now);
  sites.run(3, 'Crude Unit 1', 'Jamnagar', 'Process', now);

  /* ---------------- man-hours: 12 months of exposure data ---------------- */
  const manhourRows = [];
  for (let m = 11; m >= 0; m -= 1) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - m);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const hours = 38000 + ((11 - m) * 1450) + ((m % 3) * 900);
    manhourRows.push({
      month,
      employees_count: 320 + (11 - m) * 6,
      contractors_count: 640 + (11 - m) * 11,
      hours_worked: hours,
      safe_hours: hours - (m % 4 === 0 ? 420 : 0),
      status: 'approved'
    });
  }
  insertModule('manhours', manhourRows);

  /* ---------------- incidents (spread over months for trend analysis) ---------------- */
  const incidentTypes = [
    ['Near Miss', 0, 0], ['Near Miss', 0, 0], ['Near Miss', 0, 0], ['Near Miss', 0, 0],
    ['First Aid Case', 0, 0], ['First Aid Case', 0, 0],
    ['Medical Treatment Case', 0, 0], ['Lost Time Injury', 6, 4], ['Lost Time Injury', 3, 7],
    ['Property Damage', 0, 0], ['Fire Incident', 0, 0], ['Environmental Incident', 0, 0]
  ];
  const incidentRows = incidentTypes.map(([type, lostDays], i) => ({
    incident_type: type,
    incident_date: daysAgo(12 + i * 23),
    incident_time: `${8 + (i % 9)}:${i % 2 ? '30' : '15'}`,
    location: pick(['Fabrication Yard', 'Blast Furnace Area', 'Berth 4', 'Warehouse Block A', 'Crude Unit 1'], i),
    severity: pick(['Minor', 'Minor', 'Moderate', 'Major'], i),
    description: `${type} reported at the site during ${pick(['scaffolding erection', 'material handling', 'hot work activity', 'electrical maintenance', 'lifting operation'], i)}. Details recorded by the area HSE officer after site verification.`,
    persons_involved: pick(['2 workers', '1 worker', '1 rigger', '1 electrician', '1 supervisor'], i),
    lost_days: lostDays,
    immediate_cause: pick(['Housekeeping deficiency', 'Inadequate barricading', 'Unsafe manual handling', 'Missing machine guard', 'Tool defect'], i),
    root_cause: pick(['Procedure not followed at the workplace', 'Supervision gap during shift change', 'Inadequate training on the task', 'PPE not worn as required'], i),
    five_why: 'Why did it happen? -> [1] condition existed -> [2] check missed -> [3] checklist not used -> [4] no verification step -> [5] procedure lacks verification requirement.',
    corrective_action: 'Area made safe, re-briefing conducted and corrective action raised with the responsible supervisor.',
    preventive_action: 'Procedure updated, toolbox talk delivered to the crew and verification step added to the shift checklist.',
    investigation_status: i % 4 === 0 ? 'In Progress' : 'Completed',
    reported_by: pick(['Area HSE Officer', 'Shift Supervisor', 'Safety Steward'], i),
    status: i % 4 === 0 ? 'under_investigation' : 'closed'
  }));
  insertModule('incidents', incidentRows);

  /* ---------------- CAPA ---------------- */
  insertModule(
    'capa',
    Array.from({ length: 10 }).map((_, i) => ({
      source: pick(['Incident', 'Inspection', 'Audit', 'Observation', 'Near Miss'], i),
      finding: pick([
        'Fire extinguisher access blocked by stored material in warehouse bay',
        'Scaffold access ladder missing mid-rail at elevation 6 m',
        'Excavation edge protection incomplete along 12 m stretch',
        'Gas cylinder flashback arrestor not fitted on cutting set',
        'Contractor worker without valid height-work competency card'
      ], i),
      root_cause: pick(['Supervision gap', 'Housekeeping discipline', 'Training gap', 'Procedure not updated'], i),
      action_type: i % 3 === 0 ? 'Preventive' : 'Corrective',
      owner: pick(['Site HSE Officer', 'Civil Supervisor', 'Mechanical Supervisor', 'Contractor HSE Lead'], i),
      due_date: i < 6 ? daysAhead(4 + i * 6) : daysAgo(5 + i),
      priority: pick(['High', 'Medium', 'Critical', 'Low'], i),
      verification_method: 'Physical verification at site with photographic evidence and register update.',
      closed_date: i < 6 ? null : daysAgo(2 + i),
      status: i < 6 ? 'in_progress' : 'closed',
      title: pick(['Extinguisher access', 'Scaffold access', 'Excavation protection', 'Flashback arrestor', 'Competency verification'], i)
    }))
  );

  /* ---------------- inspections ---------------- */
  insertModule(
    'inspections',
    Array.from({ length: 12 }).map((_, i) => ({
      inspection_type: pick([
        'Daily Site Inspection', 'Scaffolding Inspection', 'Electrical Inspection', 'Fire Safety Inspection',
        'Housekeeping Inspection', 'Crane Inspection', 'Internal HSE Audit', 'PPE Inspection'
      ], i),
      area: pick(['Fabrication Yard', 'Blast Furnace Area', 'Berth 4', 'Warehouse Block A'], i),
      inspector: pick(['R. Sharma (Safety Officer)', 'A. Khan (HSE Engineer)', 'P. Nair (Safety Supervisor)'], i),
      inspection_date: daysAgo(3 + i * 5),
      findings_count: 3 + (i % 5),
      critical_findings: i % 4 === 0 ? 1 : 0,
      score: 88 - (i % 6) * 3,
      compliance_pct: 82 + (i % 7) * 2,
      actions: 'Findings recorded with responsible persons and target dates; closure tracked in CAPA register.',
      next_due: daysAhead(20 - (i % 5) * 3),
      status: 'closed',
      title: `${pick(['Area walkthrough', 'Scaffold audit', 'Electrical panel check', 'Fire point check'], i)}`
    }))
  );

  /* ---------------- observations ---------------- */
  insertModule(
    'observations',
    Array.from({ length: 9 }).map((_, i) => ({
      observation_type: pick(['Unsafe Act', 'Unsafe Condition', 'Safe Behaviour'], i),
      area: pick(['Fabrication Yard', 'Berth 4', 'Warehouse Block A', 'Crude Unit 1'], i),
      description: pick([
        'Worker observed working at height without anchoring the harness lanyard',
        'Cable lying across the walkway creating a trip hazard',
        'Crew using correct barricading and signage for hot work',
        'Grinder used without face shield in the fabrication bay',
        'Waste segregation followed correctly at the collection point'
      ], i),
      risk_level: pick(['High', 'Medium', 'Low', 'Medium'], i),
      immediate_action: 'Work stopped, correction applied and worker counselled on the spot.',
      observer: pick(['HSE Officer', 'Supervisor', 'Safety Steward'], i),
      observation_date: daysAgo(2 + i * 4),
      status: 'closed',
      title: 'Safety observation card'
    }))
  );

  /* ---------------- training ---------------- */
  insertModule(
    'training',
    Array.from({ length: 8 }).map((_, i) => ({
      training_type: pick(['Safety Induction', 'Refresher Training', 'Skill Competency', 'Safety Campaign', 'Safety Quiz'], i),
      topic: pick([
        'Work at Height & Fall Protection', 'Confined Space Entry', 'Hot Work Safety', 'LOTO Awareness',
        'Chemical Handling & MSDS', 'Emergency Response & Evacuation', 'Scaffolding Safety', 'Manual Handling'
      ], i),
      trainer: pick(['External Faculty – Safety Institute', 'HSE Manager', 'Safety Officer'], i),
      training_date: daysAgo(10 + i * 15),
      duration_hours: 2 + (i % 4),
      attendees: 24 + i * 7,
      evaluation_score: 78 + i,
      certificate_no: `CERT-${2026}-${String(100 + i)}`,
      expiry_date: i < 3 ? daysAhead(12 + i * 5) : daysAhead(240 + i * 10),
      language: pick(['Hindi', 'English', 'Bilingual'], i),
      status: 'completed',
      title: pick(['Height work refresher', 'Confined space training', 'Hot work training', 'LOTO awareness', 'Chemical safety', 'ERP training'], i)
    }))
  );

  /* ---------------- toolbox talks ---------------- */
  insertModule(
    'toolbox',
    Array.from({ length: 6 }).map((_, i) => ({
      topic: pick(['Working near moving equipment', 'Heat stress precautions', 'Housekeeping before shift end', 'Lifting signal discipline', 'PPE correct use', 'Emergency assembly point'], i),
      talk_date: daysAgo(1 + i * 3),
      conducted_by: pick(['Shift Supervisor', 'Safety Officer', 'Contractor HSE Lead'], i),
      attendees: 18 + i * 5,
      key_points: 'Site-specific hazards reviewed, controls confirmed, worker questions answered and understanding verified.',
      language: pick(['Hindi', 'Bilingual', 'English'], i),
      status: 'closed',
      title: 'Daily toolbox talk'
    }))
  );

  /* ---------------- HIRA ---------------- */
  insertModule(
    'hira',
    [
      ['Scaffold erection at 12 m height', 'Fall from height', 'Fatal injury / fracture', 5, 4, 'Guardrails, full body harness with double lanyard, trained scaffolders, permit'],
      ['Hot work in fabrication bay', 'Fire / burns', 'Burn injury, property damage', 4, 3, 'Hot work permit, fire watch, screens, extinguisher, gas test'],
      ['Excavation for foundation (3 m)', 'Cave-in', 'Crushing injury', 5, 3, 'Shoring/benching, edge protection, daily inspection, access ladder'],
      ['Lifting of structural member (18 T)', 'Load drop', 'Fatality, equipment damage', 5, 2, 'Lifting plan, certified crane, competent rigger, exclusion zone'],
      ['Confined space cleaning in sump', 'Toxic atmosphere', 'Asphyxiation', 5, 3, 'Isolation, purging, gas test, standby man, rescue plan'],
      ['Temporary electrical distribution', 'Electric shock', 'Electrocution', 5, 3, 'ELCB, earthing, IP-rated panels, authorized electrician']
    ].map(([activity, hazard, consequence, severity, likelihood, controls], i) => ({
      activity,
      area: pick(['Fabrication Yard', 'Blast Furnace Area', 'Berth 4'], i),
      hazard,
      consequence,
      severity,
      likelihood,
      control_elimination: 'Prefer off-site fabrication where practicable.',
      control_engineering: controls,
      control_admin: 'Permit to work, JSA briefing, supervision and inspection.',
      control_ppe: 'Helmet, safety shoes, gloves, goggles, full body harness where applicable.',
      residual_severity: Math.max(1, severity - 1),
      residual_likelihood: Math.max(1, likelihood - 1),
      responsible: pick(['Area Supervisor', 'HSE Officer', 'Lifting Supervisor'], i),
      review_date: daysAhead(150),
      status: 'approved',
      title: activity
    }))
  );

  /* ---------------- JSA ---------------- */
  insertModule(
    'jsa',
    [
      ['Erection of structural steel column', 'Rigging, alignment, bolting', 'Load drop, pinch points, fall', 'High', 'Lifting plan, tag lines, harness, exclusion zone, competent rigger', 'Harness, helmet, gloves, safety shoes', 'Lifting Supervisor'],
      ['Confined space cleaning – sump 2', 'Isolation, purging, entry, cleaning, exit', 'Toxic exposure, engulfment', 'Critical', 'LOTO, gas test, ventilation, standby man, rescue plan', 'SCBA where required, harness, helmet', 'HSE Officer'],
      ['Hot work on pipeline spool', 'Prepare area, gas test, weld, inspect', 'Fire, burns, fume exposure', 'High', 'Hot work permit, fire watch, screens, ventilation, PPE', 'Welding shield, apron, gloves, respirator', 'Mechanical Supervisor']
    ].map(([activity, steps, hazards, rating, controls, ppe, supervisor], i) => ({
      activity,
      job_steps: steps,
      hazards,
      consequences: 'Potential injury to personnel and damage to equipment if controls are not applied.',
      risk_rating: rating,
      control_measures: controls,
      required_ppe: ppe,
      responsible_person: supervisor,
      supervisor_name: supervisor,
      revision_no: 'A',
      review_date: daysAhead(120),
      status: 'approved',
      title: activity
    }))
  );

  /* ---------------- permits ---------------- */
  insertModule(
    'permits',
    Array.from({ length: 7 }).map((_, i) => ({
      permit_type: pick(['Hot Work Permit', 'Confined Space Entry', 'Work at Height', 'Electrical Work', 'Excavation Work', 'Lifting Operations', 'Cold Work Permit'], i),
      work_description: pick([
        'Welding of pipe support brackets at elevation',
        'Internal cleaning of sump with entry and standby man',
        'Erection of scaffold at 12 m for pipeline painting',
        'Temporary power connection for welding machines',
        'Excavation for cable trench near substation',
        'Unloading and shifting of structural members',
        'Painting of structural steel in bay 3'
      ], i),
      work_location: pick(['Fabrication Yard', 'Blast Furnace Area', 'Berth 4', 'Warehouse Block A'], i),
      contractor: pick(['Shakti Engineering Works', 'Coastal Fabricators', 'Metro Electricals', 'Sunrise Logistics'], i),
      valid_from: i < 4 ? daysAgo(1) : daysAhead(1),
      valid_to: i < 4 ? daysAhead(2 + i) : daysAhead(4 + i),
      hazard_checklist: 'Yes',
      isolation_verified: i % 3 === 0 ? 'Yes' : 'Not Applicable',
      gas_test_required: i % 2 === 0 ? 'Yes' : 'No',
      gas_test_result: i % 2 === 0 ? 'Pass' : 'Not Applicable',
      gas_test_o2: i % 2 === 0 ? 20.8 : null,
      gas_test_lel: i % 2 === 0 ? 0 : null,
      gas_test_ppm: i % 2 === 0 ? 0 : null,
      required_attachments: 'JSA, HIRA extract, competency certificates, equipment inspection reports',
      issued_by: 'Area Permit Issuer',
      authorized_by: 'HSE Manager',
      status: i < 4 ? 'active' : 'pending_approval',
      title: pick(['Hot work – pipe support', 'Sump cleaning entry', 'Scaffold erection', 'Temp power connection', 'Cable trench excavation', 'Structural unloading', 'Structural painting'], i)
    }))
  );

  /* ---------------- LOTO ---------------- */
  insertModule(
    'loto',
    Array.from({ length: 4 }).map((_, i) => ({
      equipment_name: pick(['Conveyor Drive Motor CV-201', 'Hydraulic Power Pack HP-12', 'Sump Pump SP-07', 'Panel MCC-4B'], i),
      equipment_id: `EQ-${1200 + i}`,
      tag_no: `TAG-${4500 + i}`,
      energy_sources: pick(['Electrical', 'Hydraulic', 'Multiple', 'Electrical'], i),
      isolation_method: 'Main isolator opened, breaker locked in OFF position, stored energy released and verified.',
      lock_holder: pick(['Electrical Supervisor', 'Mechanical Fitter', 'Area Electrician'], i),
      isolation_time: daysAgo(2 + i),
      zero_energy_verified: 'Yes',
      verified_by: 'Authorized Electrical Person',
      deisolation_approved_by: i < 2 ? 'Maintenance Engineer' : null,
      deisolation_time: i < 2 ? daysAgo(1) : null,
      status: i < 2 ? 'deisolated' : 'isolated',
      title: 'Energy isolation'
    }))
  );

  /* ---------------- PPE ---------------- */
  insertModule(
    'ppe',
    Array.from({ length: 8 }).map((_, i) => ({
      employee_name: pick(['Ramesh Kumar', 'Suresh Patel', 'Anil Yadav', 'Mohan Das', 'Vijay Singh', 'Kiran Rao', 'Deepak Mehta', 'Sanjay Gupta'], i),
      employee_id: `EMP-${3000 + i}`,
      ppe_item: pick(['Helmet', 'Safety Shoes', 'Safety Harness', 'Gloves', 'Goggles', 'Respiratory Protection', 'Hearing Protection', 'Face Shield'], i),
      size: pick(['M', 'L', 'XL', '9', '10'], i),
      quantity: 1,
      issue_date: daysAgo(120 + i * 9),
      expiry_date: i < 3 ? daysAhead(8 + i * 6) : daysAhead(200 + i * 12),
      condition: i < 2 ? 'Replace' : 'Good',
      status: 'issued',
      title: 'PPE issue'
    }))
  );

  /* ---------------- fire equipment ---------------- */
  insertModule(
    'fire',
    Array.from({ length: 8 }).map((_, i) => ({
      item_type: pick(['Fire Extinguisher', 'Fire Extinguisher', 'Fire Hydrant', 'Fire Alarm', 'Assembly Point', 'Rescue Equipment'], i),
      location: pick(['Fabrication Yard – Gate 1', 'Warehouse Block A', 'Blast Furnace Area', 'Berth 4', 'Admin Building', 'Crude Unit 1'], i),
      capacity: pick(['ABC 6 kg', 'CO2 4.5 kg', 'Hydrant point 2', 'Manual call point', 'Assembly point A', 'Tripod + SCBA set'], i),
      last_inspection: daysAgo(20 + i * 4),
      next_due: i < 3 ? daysAhead(5 + i * 4) : daysAhead(25 + i * 6),
      refill_date: daysAgo(180 + i * 10),
      condition: i < 2 ? 'Service Required' : 'OK',
      status: i < 2 ? 'expired' : 'active',
      title: 'Fire equipment register'
    }))
  );

  /* ---------------- drills ---------------- */
  insertModule(
    'drills',
    Array.from({ length: 4 }).map((_, i) => ({
      drill_type: pick(['Fire Drill', 'Evacuation Drill', 'Rescue Drill', 'Chemical Spill Drill'], i),
      drill_date: daysAgo(30 + i * 45),
      participants: 120 + i * 30,
      response_time_sec: 210 - i * 15,
      observations: 'Assembly point headcount completed, one exit partially obstructed and corrected immediately.',
      effectiveness: i % 2 === 0 ? 'Effective' : 'Needs Improvement',
      status: 'closed',
      title: pick(['Fire drill', 'Full evacuation drill', 'Confined space rescue drill', 'Chemical spill drill'], i)
    }))
  );

  /* ---------------- environment / waste / health ---------------- */
  insertModule('environment', Array.from({ length: 5 }).map((_, i) => ({
    aspect: pick(['Dust generation during grinding', 'Noise from fabrication activities', 'Effluent from washing bay', 'Stack emission from DG set', 'Chemical storage runoff'], i),
    impact: 'Air / water / soil impact if controls are not maintained.',
    parameter: pick(['Air Quality', 'Noise', 'Water', 'Air Quality', 'Chemical Spillage'], i),
    measured_value: pick([72, 84, 6.8, 118, 0], i),
    unit: pick(['µg/m³', 'dB(A)', 'pH', 'mg/Nm³', 'spills'], i),
    limit_value: pick([100, 90, 8.5, 150, 0], i),
    monitoring_date: daysAgo(7 + i * 9),
    compliance: 'Compliant',
    status: 'approved',
    title: 'Environmental monitoring'
  })));

  insertModule('waste', Array.from({ length: 4 }).map((_, i) => ({
    waste_type: pick(['Used oil', 'Scrap metal', 'E-waste', 'Spent solvent'], i),
    category: pick(['Hazardous', 'Non-hazardous', 'E-waste', 'Hazardous'], i),
    quantity: pick([420, 2400, 120, 260], i),
    unit: 'kg',
    disposal_method: 'Handed over to authorized recycler with manifest',
    vendor: 'Authorized Waste Vendor',
    manifest_no: `MAN-${2026}-${200 + i}`,
    disposal_date: daysAgo(15 + i * 12),
    status: 'disposed',
    title: 'Waste disposal'
  })));

  insertModule('health', Array.from({ length: 4 }).map((_, i) => ({
    employee_name: pick(['Ramesh Kumar', 'Mohan Das', 'Vijay Singh', 'Kiran Rao'], i),
    employee_id: `EMP-${3000 + i}`,
    fitness_status: pick(['Fit', 'Fit', 'Fit with Restriction', 'Fit'], i),
    medical_date: daysAgo(180 + i * 20),
    next_due: i < 2 ? daysAhead(15 + i * 10) : daysAhead(150 + i * 20),
    exposure_type: pick(['Noise', 'Dust', 'Chemical', 'Heat Stress'], i),
    restrictions: i === 2 ? 'Restricted from work at height above 10 m pending review.' : 'None',
    confidential: 1,
    status: 'approved',
    title: 'Health surveillance'
  })));

  /* ---------------- workforce / contractors ---------------- */
  insertModule('contractors', Array.from({ length: 5 }).map((_, i) => ({
    contractor_name: pick(['Shakti Engineering Works', 'Coastal Fabricators', 'Metro Electricals', 'Sunrise Logistics', 'Vertex Insulation'], i),
    work_scope: pick(['Structural fabrication and erection', 'Painting and insulation', 'Electrical installation', 'Material handling', 'Scaffolding services'], i),
    workers_count: 60 + i * 25,
    safety_score: 92 - i * 4,
    evaluation_date: daysAgo(40 + i * 12),
    documents_verified: i === 4 ? 'Partial' : 'Yes',
    licence_no: `LIC-${2026}-${110 + i}`,
    insurance_valid_till: daysAhead(120 + i * 30),
    status: 'active',
    title: pick(['Structural contractor', 'Painting contractor', 'Electrical contractor', 'Logistics contractor', 'Insulation contractor'], i)
  })));

  insertModule('employees', Array.from({ length: 10 }).map((_, i) => ({
    employee_name: pick(['Ramesh Kumar', 'Suresh Patel', 'Anil Yadav', 'Mohan Das', 'Vijay Singh', 'Kiran Rao', 'Deepak Mehta', 'Sanjay Gupta', 'Arun Mishra', 'Pooja Sharma'], i),
    designation: pick(['Fitter', 'Welder', 'Rigger', 'Electrician', 'Helper', 'Safety Steward'], i),
    department: pick(['Mechanical', 'Fabrication', 'Lifting', 'Electrical', 'Civil'], i),
    contractor_name: pick(['Shakti Engineering Works', 'Coastal Fabricators', 'Metro Electricals'], i),
    induction_date: daysAgo(90 + i * 7),
    competency: i === 9 ? 'Pending' : 'Verified',
    ppe_issued: 'Yes',
    project_site: pick(['Greenfield Steel Plant Expansion', 'Coastal Logistics Terminal – Phase 3'], i),
    status: 'active',
    title: 'Workforce record'
  })));

  /* ---------------- MOC / lifting / equipment / construction / legal ---------------- */
  insertModule('moc', Array.from({ length: 3 }).map((_, i) => ({
    change_type: pick(['Process', 'Equipment', 'Procedure'], i),
    reason: pick([
      'Substitute pump seal type to reduce leak frequency',
      'Relocate temporary diesel storage away from hot work zone',
      'Revise excavation procedure after audit observation'
    ], i),
    risk_assessment_done: 'Yes',
    technical_review: 'Approved',
    safety_review: 'Approved',
    pssr_required: i === 0 ? 'Yes' : 'No',
    pssr_status: i === 0 ? 'In Progress' : 'Not Applicable',
    action_closure: 'Actions closed with verification by area HSE.',
    final_authorization: 'Authorized',
    effective_date: daysAhead(10 + i * 15),
    status: 'approved',
    title: pick(['Pump seal change', 'Diesel storage relocation', 'Excavation procedure revision'], i)
  })));

  insertModule('lifting', Array.from({ length: 4 }).map((_, i) => ({
    load_description: pick(['Structural column 18 T', 'Pipe rack module 12 T', 'Generator skid 9 T', 'Precast panel 6 T'], i),
    load_weight: pick([18, 12, 9, 6], i),
    crane_id: pick(['CR-01 (100 T)', 'CR-02 (60 T)', 'CR-03 (50 T)', 'CR-01 (100 T)'], i),
    crane_capacity: pick([100, 60, 50, 100], i),
    utilization_pct: pick([42, 58, 66, 34], i),
    rigging_gear: 'Four-leg sling with certified shackles, load tested within validity.',
    operator_competency: 'Valid',
    rigger_competency: 'Valid',
    signalman: pick(['Trained signalman A', 'Trained signalman B'], i),
    ground_condition: pick(['Good', 'Requires Matting', 'Good', 'Good'], i),
    critical_lift: i === 1 ? 'Yes' : 'No',
    lift_date: daysAgo(5 + i * 8),
    status: 'approved',
    title: pick(['Column erection lift', 'Pipe rack module lift', 'Generator skid lift', 'Precast panel lift'], i)
  })));

  insertModule('equipment', Array.from({ length: 5 }).map((_, i) => ({
    equipment_name: pick(['EOT Crane 50 T', 'Air Compressor AC-4', 'Welding Machine WM-12', 'Passenger Hoist PH-2', 'DG Set 500 kVA'], i),
    equipment_id: `EQP-${400 + i}`,
    inspection_type: pick(['Third Party Inspection', 'Statutory Test', 'Preventive Maintenance', 'Calibration', 'Daily Check'], i),
    last_inspection: daysAgo(60 + i * 15),
    next_due: i < 2 ? daysAhead(6 + i * 5) : daysAhead(90 + i * 20),
    certificate_no: `CERT-EQP-${900 + i}`,
    inspector: pick(['Third Party Agency', 'Plant Maintenance', 'Statutory Inspector'], i),
    condition: 'Good',
    status: 'active',
    title: pick(['EOT crane inspection', 'Compressor maintenance', 'Welding machine calibration', 'Hoist statutory test', 'DG set inspection'], i)
  })));

  insertModule('construction', Array.from({ length: 5 }).map((_, i) => ({
    activity_type: pick(['Excavation', 'Scaffolding', 'Work at Height', 'Confined Space', 'Lifting & Rigging'], i),
    area: pick(['Fabrication Yard', 'Berth 4', 'Blast Furnace Area'], i),
    checklist_score: 88 - i * 3,
    findings: 'Edge protection, access and signage verified; minor gaps closed on the spot.',
    permit_ref: `PTW-000${i + 1}`,
    responsible: pick(['Civil Supervisor', 'Scaffolding Supervisor', 'Lifting Supervisor'], i),
    inspection_date: daysAgo(4 + i * 6),
    status: 'approved',
    title: pick(['Excavation safety check', 'Scaffold safety check', 'Height work check', 'Confined space check', 'Lifting safety check'], i)
  })));

  insertModule('legal', [
    { act_regulation: 'Factories Act, 1948', clause_reference: 'Section 7A / 41B (as applicable)', requirement: 'Occupational safety and health of workers; safety committee and safety officers as applicable to the establishment.', applicable_to: 'Manufacturing and process sites', compliance_status: 'Compliant', evidence: 'Safety officer appointment letters, safety committee minutes', review_date: daysAhead(120), source_reference: 'Verify current text from the official gazette / state factory rules before citing.' },
    { act_regulation: 'State Factory Rules (applicable state)', clause_reference: 'Verify rule number', requirement: 'Site-specific requirements on fencing of machinery, hoists, lifting equipment testing and welfare facilities.', applicable_to: 'All factory sites in the state', compliance_status: 'Partially Compliant', evidence: 'Third-party inspection reports, welfare facility checklist', review_date: daysAhead(90), source_reference: 'State factory rules – verify current version.' },
    { act_regulation: 'OSHWC Code (when in force in the state)', clause_reference: 'Verify applicability notification', requirement: 'Duties of employer, occupational safety and health standards, and welfare provisions.', applicable_to: 'Establishments covered by state notification', compliance_status: 'Under Review', evidence: 'Compliance mapping in progress', review_date: daysAhead(60), source_reference: 'Confirm commencement notification for the state before use.' },
    { act_regulation: 'ISO 45001:2018', clause_reference: 'Clause 8.1 / 10.2', requirement: 'Operational planning and control; incident, nonconformity and corrective action.', applicable_to: 'HSE management system', compliance_status: 'Compliant', evidence: 'Internal audit reports, CAPA register', review_date: daysAhead(180), source_reference: 'ISO 45001:2018 standard text.' }
  ].map((row) => ({ ...row, status: 'approved', title: row.act_regulation })));

  /* ---------------- jobs (clearly marked demo / unverified source) ---------------- */
  const jobStmt = db.prepare(
    `INSERT INTO jobs (title, company, category, state, city, salary_min, salary_max, experience_min, experience_max,
      qualification, job_type, description, apply_url, contact_email, source, source_verified, featured, status, expiry_date, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const demoJobs = [
    ['Safety Officer', 'Demo listing – replace with verified vacancy', 'Safety Officer', 'Gujarat', 'Mundra', 35000, 52000, 2, 5, 'Diploma in Industrial Safety / ADIS', 'private', 'Site safety officer for an industrial construction project. Responsibilities include daily inspection, permit verification, toolbox talks and incident reporting.', 0, 0, 'published', daysAhead(25)],
    ['HSE Engineer', 'Demo listing – replace with verified vacancy', 'HSE Engineer', 'Odisha', 'Angul', 55000, 80000, 4, 8, 'B.E./B.Tech + PG in Industrial Safety', 'private', 'HSE engineer for a steel plant expansion: HIRA, JSA, audits, contractor HSE management and MIS reporting.', 1, 1, 'published', daysAhead(40)],
    ['Safety Supervisor', 'Demo listing – replace with verified vacancy', 'Safety Supervisor', 'Maharashtra', 'Pune', 28000, 38000, 1, 4, 'Diploma + Safety Supervisor certificate', 'private', 'Supervisor for fabrication yard safety, PPE compliance and observation card program.', 0, 0, 'published', daysAhead(18)],
    ['Safety Manager', 'Demo listing – replace with verified vacancy', 'Safety Manager', 'Gujarat', 'Jamnagar', 90000, 140000, 10, 18, 'Engineering degree + ADIS/NEBOSH', 'private', 'Lead the HSE function for a refinery turnaround including contractor safety and emergency preparedness.', 0, 1, 'published', daysAhead(30)],
    ['Fire & Safety Officer', 'Demo listing – replace with verified vacancy', 'Fire and Safety Officer', 'Tamil Nadu', 'Chennai', 32000, 46000, 2, 6, 'B.Sc Fire & Safety / Diploma', 'government', 'Fire and safety officer for a port terminal: fire equipment inspection, drills and emergency response.', 0, 0, 'published', daysAhead(22)],
    ['Environmental Officer', 'Demo listing – replace with verified vacancy', 'Environmental Officer', 'Karnataka', 'Bengaluru', 45000, 65000, 3, 7, 'M.Sc Environmental Science', 'private', 'Environmental monitoring, waste management and compliance reporting for an industrial facility.', 0, 0, 'published', daysAhead(35)]
  ];
  for (const j of demoJobs) {
    jobStmt.run(
      j[0], j[1], j[2], j[3], j[4], j[5], j[6], j[7], j[8], j[9], j[10], j[11],
      null, 'its.surajsahani@gmail.com', 'Demo dataset – source not verified. Owner must verify before publishing.', 0, j[12], 'published', j[13], now, now
    );
  }

  /* ---------------- document library from templates ---------------- */
  const docStmt = db.prepare(
    `INSERT INTO documents (doc_no, title, category, doc_type, template_key, revision, status, content, company, project_name,
      prepared_by, checked_by, approved_by, issue_date, review_date, is_sample, created_at, updated_at)
     VALUES (?, ?, ?, 'template', ?, 'A', 'draft', ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`
  );
  const versionStmt = db.prepare(
    'INSERT INTO document_versions (document_id, revision, content, status, change_note, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  );
  TEMPLATES.forEach((template, index) => {
    const docNo = `${template.code}-${String(index + 1).padStart(3, '0')}`;
    const content = renderTemplate(template, {
      docNo,
      revision: 'A',
      issueDate: daysAgo(1),
      reviewDate: daysAhead(365),
      company: '[Company Name]',
      project: '[Project / Site]'
    });
    const info = docStmt.run(
      docNo,
      template.title,
      template.category,
      template.key,
      content,
      '[Company Name]',
      '[Project / Site]',
      '[Prepared By]',
      '[Checked By]',
      '[Approved By]',
      daysAgo(1),
      daysAhead(365),
      now,
      now
    );
    versionStmt.run(info.lastInsertRowid, 'A', content, 'draft', 'Initial template issue', now);
  });

  setSetting('demo_seeded_at', now);
  setSetting('demo_dataset', 'true');
  return { seeded: true };
}
