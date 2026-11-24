/**
 * SURAJ SAFETY HERO - HSE module registry.
 *
 * This metadata drives: database table creation, generic REST endpoints,
 * client-side tables/forms/filters and dashboard roll-ups. Adding a field
 * here adds it everywhere (table column, API validation, UI form).
 */

const f = (name, label, type = 'text', extra = {}) => ({ name, label, type, ...extra });

export const ROLES = [
  'super_admin',
  'admin',
  'hse_manager',
  'safety_officer',
  'safety_supervisor',
  'site_engineer',
  'contractor',
  'employee'
];

export const ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  hse_manager: 'HSE Manager',
  safety_officer: 'Safety Officer',
  safety_supervisor: 'Safety Supervisor',
  site_engineer: 'Site Engineer',
  contractor: 'Contractor',
  employee: 'General Employee'
};

const MANAGERS = ['super_admin', 'admin', 'hse_manager'];
const HSE_STAFF = ['super_admin', 'admin', 'hse_manager', 'safety_officer', 'safety_supervisor'];
const FIELD_STAFF = [...HSE_STAFF, 'site_engineer', 'contractor'];

export const DEFAULT_STATUSES = ['draft', 'pending_approval', 'approved', 'rejected', 'closed'];

export const riskBand = (score) => {
  const n = Number(score) || 0;
  if (n >= 16) return 'Critical';
  if (n >= 10) return 'High';
  if (n >= 5) return 'Medium';
  if (n > 0) return 'Low';
  return 'Not rated';
};

const riskDerive = (row) => {
  const sev = Number(row.severity) || 0;
  const lik = Number(row.likelihood) || 0;
  const rsev = Number(row.residual_severity) || 0;
  const rlik = Number(row.residual_likelihood) || 0;
  const initial = sev * lik;
  const residual = rsev * rlik;
  return {
    initial_risk: initial || null,
    risk_band: riskBand(initial),
    residual_risk: residual || null,
    residual_band: riskBand(residual)
  };
};

export const MODULES = [
  {
    key: 'hira',
    table: 'hira_risks',
    name: 'HIRA & Risk Register',
    short: 'HIRA',
    prefix: 'HIRA',
    group: 'Risk Management',
    icon: '⚠',
    description: 'Hazard identification, 5x5 risk scoring, hierarchy of controls and residual risk approval.',
    statuses: DEFAULT_STATUSES,
    readRoles: FIELD_STAFF,
    writeRoles: FIELD_STAFF,
    approveRoles: MANAGERS,
    derive: riskDerive,
    fields: [
      f('activity', 'Activity / Task', 'text', { required: true, search: true }),
      f('area', 'Area / Location', 'text', { search: true }),
      f('hazard', 'Hazard Identified', 'textarea', { required: true }),
      f('consequence', 'Potential Consequence', 'textarea'),
      f('severity', 'Severity (1-5)', 'number', { min: 1, max: 5, required: true }),
      f('likelihood', 'Likelihood (1-5)', 'number', { min: 1, max: 5, required: true }),
      f('initial_risk', 'Initial Risk Score', 'number', { readonly: true }),
      f('risk_band', 'Initial Risk Band', 'text', { readonly: true }),
      f('control_elimination', 'Elimination / Substitution', 'textarea'),
      f('control_engineering', 'Engineering Controls', 'textarea'),
      f('control_admin', 'Administrative Controls', 'textarea'),
      f('control_ppe', 'PPE Controls', 'textarea'),
      f('residual_severity', 'Residual Severity (1-5)', 'number', { min: 1, max: 5 }),
      f('residual_likelihood', 'Residual Likelihood (1-5)', 'number', { min: 1, max: 5 }),
      f('residual_risk', 'Residual Risk Score', 'number', { readonly: true }),
      f('residual_band', 'Residual Risk Band', 'text', { readonly: true }),
      f('responsible', 'Responsible Person', 'text'),
      f('review_date', 'Review Date', 'date')
    ]
  },
  {
    key: 'jsa',
    table: 'jsa_records',
    name: 'Job Safety Analysis',
    short: 'JSA',
    prefix: 'JSA',
    group: 'Risk Management',
    icon: '📋',
    description: 'Step-by-step job safety analysis with hazards, controls, PPE and supervisor approval.',
    statuses: DEFAULT_STATUSES,
    readRoles: FIELD_STAFF,
    writeRoles: FIELD_STAFF,
    approveRoles: MANAGERS,
    fields: [
      f('activity', 'Activity Description', 'text', { required: true, search: true }),
      f('job_steps', 'Job Steps', 'textarea', { required: true }),
      f('hazards', 'Hazards', 'textarea'),
      f('consequences', 'Potential Consequences', 'textarea'),
      f('risk_rating', 'Risk Rating', 'select', { options: ['Low', 'Medium', 'High', 'Critical'] }),
      f('control_measures', 'Control Measures', 'textarea'),
      f('required_ppe', 'Required PPE', 'text'),
      f('responsible_person', 'Responsible Person', 'text'),
      f('supervisor_name', 'Supervisor', 'text'),
      f('revision_no', 'Revision No.', 'text'),
      f('review_date', 'Review Date', 'date')
    ]
  },
  {
    key: 'permits',
    table: 'permits',
    name: 'Permit to Work',
    short: 'PTW',
    prefix: 'PTW',
    group: 'Permit & Isolation',
    icon: '🔐',
    description: 'Digital permit lifecycle: hazard checklist, gas testing, isolation, suspension, extension and closure.',
    statuses: ['draft', 'pending_approval', 'approved', 'active', 'suspended', 'closed', 'rejected', 'expired'],
    readRoles: FIELD_STAFF,
    writeRoles: FIELD_STAFF,
    approveRoles: MANAGERS,
    fields: [
      f('permit_type', 'Permit Category', 'select', {
        required: true,
        options: [
          'Hot Work Permit', 'Cold Work Permit', 'Confined Space Entry', 'Work at Height',
          'Electrical Work', 'Excavation Work', 'Lifting Operations', 'Line Breaking',
          'Radiography Work', 'General Work Permit', 'Painting and Chemical Work', 'Welding and Gas Cutting'
        ]
      }),
      f('work_description', 'Work Description', 'textarea', { required: true, search: true }),
      f('work_location', 'Work Location / Area', 'text', { search: true }),
      f('contractor', 'Executing Contractor', 'text'),
      f('valid_from', 'Valid From', 'date', { required: true }),
      f('valid_to', 'Valid To', 'date', { required: true }),
      f('hazard_checklist', 'Hazard Checklist Completed', 'select', { options: ['Yes', 'No', 'Partial'] }),
      f('isolation_verified', 'Isolation Verified', 'select', { options: ['Yes', 'No', 'Not Applicable'] }),
      f('gas_test_required', 'Gas Test Required', 'select', { options: ['Yes', 'No'] }),
      f('gas_test_result', 'Gas Test Result', 'select', { options: ['Pass', 'Fail', 'Not Applicable'] }),
      f('gas_test_o2', 'O2 (% vol)', 'number'),
      f('gas_test_lel', 'LEL (% vol)', 'number'),
      f('gas_test_ppm', 'Toxic Gas (ppm)', 'number'),
      f('required_attachments', 'Required Attachments', 'text'),
      f('issued_by', 'Issued By (Permit Issuer)', 'text'),
      f('authorized_by', 'Authorized By', 'text'),
      f('closure_note', 'Closure / Handback Note', 'textarea')
    ]
  },
  {
    key: 'loto',
    table: 'isolations',
    name: 'LOTO & Isolation',
    short: 'LOTO',
    prefix: 'LOTO',
    group: 'Permit & Isolation',
    icon: '🔒',
    description: 'Energy isolation register, lock and tag control, zero-energy verification and de-isolation approval.',
    statuses: ['draft', 'pending_approval', 'approved', 'isolated', 'deisolated', 'closed'],
    readRoles: FIELD_STAFF,
    writeRoles: FIELD_STAFF,
    approveRoles: MANAGERS,
    fields: [
      f('equipment_name', 'Equipment', 'text', { required: true, search: true }),
      f('equipment_id', 'Equipment Tag / ID', 'text', { search: true }),
      f('tag_no', 'Lock / Tag Number', 'text', { required: true }),
      f('energy_sources', 'Energy Source', 'select', {
        options: ['Electrical', 'Mechanical', 'Hydraulic', 'Pneumatic', 'Thermal', 'Chemical', 'Gravity', 'Multiple']
      }),
      f('isolation_method', 'Isolation Method', 'textarea'),
      f('lock_holder', 'Lock Holder (Authorized Person)', 'text'),
      f('isolation_time', 'Isolation Date & Time', 'date'),
      f('zero_energy_verified', 'Zero Energy Verified', 'select', { options: ['Yes', 'No'] }),
      f('verified_by', 'Verified By', 'text'),
      f('deisolation_approved_by', 'De-isolation Approved By', 'text'),
      f('deisolation_time', 'De-isolation Date & Time', 'date')
    ]
  },
  {
    key: 'incidents',
    table: 'incidents',
    name: 'Incident Management',
    short: 'Incidents',
    prefix: 'INC',
    group: 'Incident & CAPA',
    icon: '🚨',
    description: 'Report and investigate incidents, near misses, first aid, LTI, property damage and environmental events.',
    statuses: ['draft', 'pending_approval', 'approved', 'under_investigation', 'closed'],
    readRoles: FIELD_STAFF,
    writeRoles: FIELD_STAFF,
    approveRoles: MANAGERS,
    fields: [
      f('incident_type', 'Incident Type', 'select', {
        required: true,
        options: [
          'Near Miss', 'First Aid Case', 'Medical Treatment Case', 'Lost Time Injury', 'Fatality',
          'Property Damage', 'Fire Incident', 'Environmental Incident', 'Unsafe Act', 'Unsafe Condition'
        ]
      }),
      f('incident_date', 'Incident Date', 'date', { required: true }),
      f('incident_time', 'Incident Time', 'text'),
      f('location', 'Location / Area', 'text', { search: true }),
      f('severity', 'Severity', 'select', { options: ['Minor', 'Moderate', 'Major', 'Critical', 'Fatal'] }),
      f('description', 'What Happened', 'textarea', { required: true }),
      f('persons_involved', 'Persons Involved', 'text'),
      f('lost_days', 'Lost Days', 'number'),
      f('immediate_cause', 'Immediate Cause', 'textarea'),
      f('root_cause', 'Root Cause', 'textarea'),
      f('five_why', '5 Why Analysis', 'textarea'),
      f('corrective_action', 'Corrective Action', 'textarea'),
      f('preventive_action', 'Preventive Action', 'textarea'),
      f('investigation_status', 'Investigation Status', 'select', { options: ['Open', 'In Progress', 'Completed', 'Closed'] }),
      f('reported_by', 'Reported By', 'text')
    ]
  },
  {
    key: 'capa',
    table: 'capa_records',
    name: 'CAPA Tracking',
    short: 'CAPA',
    prefix: 'CAPA',
    group: 'Incident & CAPA',
    icon: '✅',
    description: 'Corrective and preventive action register with owners, deadlines and verification of effectiveness.',
    statuses: ['draft', 'pending_approval', 'approved', 'in_progress', 'verified', 'closed'],
    readRoles: FIELD_STAFF,
    writeRoles: FIELD_STAFF,
    approveRoles: MANAGERS,
    fields: [
      f('source', 'Source', 'select', { options: ['Incident', 'Inspection', 'Audit', 'Observation', 'Near Miss', 'Management Review', 'Complaint'] }),
      f('finding', 'Finding / Non-conformity', 'textarea', { required: true, search: true }),
      f('root_cause', 'Root Cause', 'textarea'),
      f('action_type', 'Action Type', 'select', { options: ['Corrective', 'Preventive'] }),
      f('owner', 'Action Owner', 'text', { required: true }),
      f('due_date', 'Target Date', 'date', { required: true }),
      f('priority', 'Priority', 'select', { options: ['Low', 'Medium', 'High', 'Critical'] }),
      f('verification_method', 'Verification of Effectiveness', 'textarea'),
      f('closed_date', 'Closed Date', 'date')
    ]
  },
  {
    key: 'inspections',
    table: 'inspections',
    name: 'Safety Inspection & Audit',
    short: 'Inspections',
    prefix: 'INSP',
    group: 'Inspection & Audit',
    icon: '🔍',
    description: 'Daily to annual inspections, internal/external/ISO audits, scoring and action tracking.',
    statuses: ['draft', 'pending_approval', 'approved', 'closed'],
    readRoles: FIELD_STAFF,
    writeRoles: FIELD_STAFF,
    approveRoles: MANAGERS,
    fields: [
      f('inspection_type', 'Inspection / Audit Type', 'select', {
        required: true,
        options: [
          'Daily Site Inspection', 'Weekly Inspection', 'Monthly Inspection', 'Workplace Inspection',
          'Electrical Inspection', 'Fire Safety Inspection', 'Scaffolding Inspection', 'Ladder Inspection',
          'Crane Inspection', 'Lifting Tools Inspection', 'Vehicle Inspection', 'Housekeeping Inspection',
          'PPE Inspection', 'Equipment Inspection', 'Contractor Inspection', 'Internal HSE Audit',
          'External Audit', 'ISO Audit'
        ]
      }),
      f('area', 'Area / Location', 'text', { search: true }),
      f('inspector', 'Inspector', 'text', { required: true }),
      f('inspection_date', 'Inspection Date', 'date', { required: true }),
      f('findings_count', 'Total Findings', 'number'),
      f('critical_findings', 'Critical Findings', 'number'),
      f('score', 'Score', 'number'),
      f('compliance_pct', 'Compliance %', 'number'),
      f('actions', 'Findings & Actions', 'textarea'),
      f('next_due', 'Next Inspection Due', 'date')
    ]
  },
  {
    key: 'observations',
    table: 'observations',
    name: 'Safety Observations',
    short: 'Observations',
    prefix: 'OBS',
    group: 'Inspection & Audit',
    icon: '👁',
    description: 'Unsafe act / unsafe condition / safe behaviour observation cards with immediate correction.',
    statuses: ['draft', 'pending_approval', 'approved', 'closed'],
    readRoles: FIELD_STAFF,
    writeRoles: FIELD_STAFF,
    approveRoles: MANAGERS,
    fields: [
      f('observation_type', 'Observation Type', 'select', {
        required: true,
        options: ['Unsafe Act', 'Unsafe Condition', 'Safe Behaviour']
      }),
      f('area', 'Area / Location', 'text', { search: true }),
      f('description', 'Observation Detail', 'textarea', { required: true }),
      f('risk_level', 'Risk Level', 'select', { options: ['Low', 'Medium', 'High', 'Critical'] }),
      f('immediate_action', 'Immediate Action Taken', 'textarea'),
      f('observer', 'Observer', 'text'),
      f('observation_date', 'Observation Date', 'date')
    ]
  },
  {
    key: 'ppe',
    table: 'ppe_records',
    name: 'PPE Management',
    short: 'PPE',
    prefix: 'PPE',
    group: 'Workforce & PPE',
    icon: '🦺',
    description: 'PPE issue register, inventory, expiry, inspection and replacement tracking per employee.',
    statuses: ['draft', 'approved', 'issued', 'expired', 'closed'],
    readRoles: FIELD_STAFF,
    writeRoles: FIELD_STAFF,
    approveRoles: MANAGERS,
    fields: [
      f('employee_name', 'Employee Name', 'text', { required: true, search: true }),
      f('employee_id', 'Employee ID', 'text', { search: true }),
      f('ppe_item', 'PPE Item', 'select', {
        required: true,
        options: ['Helmet', 'Safety Shoes', 'Gloves', 'Goggles', 'Face Shield', 'Safety Harness', 'Respiratory Protection', 'Hearing Protection', 'Hi-Vis Vest', 'Full Body Suit']
      }),
      f('size', 'Size', 'text'),
      f('quantity', 'Quantity', 'number'),
      f('issue_date', 'Issue Date', 'date'),
      f('expiry_date', 'Expiry / Replacement Due', 'date'),
      f('condition', 'Condition', 'select', { options: ['New', 'Good', 'Replace', 'Damaged'] }),
      f('replaced_on', 'Replaced On', 'date')
    ]
  },
  {
    key: 'training',
    table: 'training_records',
    name: 'Training & Competency',
    short: 'Training',
    prefix: 'TRN',
    group: 'Training & Competency',
    icon: '🎓',
    description: 'Induction, refresher and competency training with attendance, evaluation and certificate expiry.',
    statuses: ['draft', 'pending_approval', 'approved', 'completed', 'closed'],
    readRoles: FIELD_STAFF,
    writeRoles: FIELD_STAFF,
    approveRoles: MANAGERS,
    fields: [
      f('training_type', 'Training Type', 'select', {
        required: true,
        options: ['Safety Induction', 'Refresher Training', 'Skill Competency', 'Safety Campaign', 'Safety Quiz', 'Supervisor Development']
      }),
      f('topic', 'Topic', 'text', { required: true, search: true }),
      f('trainer', 'Trainer', 'text'),
      f('training_date', 'Training Date', 'date', { required: true }),
      f('duration_hours', 'Duration (hours)', 'number'),
      f('attendees', 'Attendees', 'number'),
      f('evaluation_score', 'Average Evaluation Score', 'number'),
      f('certificate_no', 'Certificate No.', 'text'),
      f('expiry_date', 'Valid Until', 'date'),
      f('language', 'Delivery Language', 'select', { options: ['Hindi', 'English', 'Bilingual'] })
    ]
  },
  {
    key: 'toolbox',
    table: 'toolbox_talks',
    name: 'Toolbox Talks',
    short: 'Toolbox',
    prefix: 'TBT',
    group: 'Training & Competency',
    icon: '📢',
    description: 'Daily briefing and toolbox talk records with attendance and key safety messages.',
    statuses: ['draft', 'approved', 'closed'],
    readRoles: FIELD_STAFF,
    writeRoles: FIELD_STAFF,
    approveRoles: MANAGERS,
    fields: [
      f('topic', 'Talk Topic', 'text', { required: true, search: true }),
      f('talk_date', 'Date', 'date', { required: true }),
      f('conducted_by', 'Conducted By', 'text'),
      f('attendees', 'Attendees', 'number'),
      f('key_points', 'Key Points Covered', 'textarea'),
      f('language', 'Language', 'select', { options: ['Hindi', 'English', 'Bilingual'] })
    ]
  },
  {
    key: 'environment',
    table: 'environmental_records',
    name: 'Environmental Monitoring',
    short: 'Environment',
    prefix: 'ENV',
    group: 'Environment & Health',
    icon: '🌿',
    description: 'Aspects and impacts, air/noise/water monitoring against limits, and environmental compliance.',
    statuses: ['draft', 'pending_approval', 'approved', 'non_compliant', 'closed'],
    readRoles: FIELD_STAFF,
    writeRoles: FIELD_STAFF,
    approveRoles: MANAGERS,
    fields: [
      f('aspect', 'Environmental Aspect', 'text', { required: true, search: true }),
      f('impact', 'Potential Impact', 'textarea'),
      f('parameter', 'Monitoring Parameter', 'select', {
        options: ['Air Quality', 'Noise', 'Water', 'Soil', 'Chemical Spillage', 'Dust']
      }),
      f('measured_value', 'Measured Value', 'number'),
      f('unit', 'Unit', 'text'),
      f('limit_value', 'Permissible Limit', 'number'),
      f('monitoring_date', 'Monitoring Date', 'date'),
      f('compliance', 'Compliance Status', 'select', { options: ['Compliant', 'Non-compliant', 'Under Review'] })
    ]
  },
  {
    key: 'waste',
    table: 'waste_records',
    name: 'Waste Management',
    short: 'Waste',
    prefix: 'WST',
    group: 'Environment & Health',
    icon: '♻',
    description: 'Hazardous and non-hazardous waste register with disposal vendor and manifest tracking.',
    statuses: ['draft', 'approved', 'disposed', 'closed'],
    readRoles: FIELD_STAFF,
    writeRoles: FIELD_STAFF,
    approveRoles: MANAGERS,
    fields: [
      f('waste_type', 'Waste Type', 'text', { required: true, search: true }),
      f('category', 'Category', 'select', { options: ['Hazardous', 'Non-hazardous', 'E-waste', 'Biomedical'] }),
      f('quantity', 'Quantity', 'number'),
      f('unit', 'Unit', 'text'),
      f('disposal_method', 'Disposal Method', 'text'),
      f('vendor', 'Authorized Vendor', 'text'),
      f('manifest_no', 'Manifest No.', 'text'),
      f('disposal_date', 'Disposal Date', 'date')
    ]
  },
  {
    key: 'health',
    table: 'health_records',
    name: 'Occupational Health',
    short: 'Health',
    prefix: 'OHS',
    group: 'Environment & Health',
    icon: '🩺',
    description: 'Restricted-access medical fitness, surveillance schedules and exposure monitoring records.',
    statuses: ['draft', 'approved', 'closed'],
    readRoles: ['super_admin', 'admin', 'hse_manager', 'safety_officer'],
    writeRoles: ['super_admin', 'admin', 'hse_manager', 'safety_officer'],
    approveRoles: MANAGERS,
    fields: [
      f('employee_name', 'Employee Name', 'text', { required: true, search: true }),
      f('employee_id', 'Employee ID', 'text', { search: true }),
      f('fitness_status', 'Medical Fitness Status', 'select', { options: ['Fit', 'Fit with Restriction', 'Unfit', 'Pending'] }),
      f('medical_date', 'Medical Examination Date', 'date'),
      f('next_due', 'Next Surveillance Due', 'date'),
      f('exposure_type', 'Exposure Type', 'select', { options: ['Noise', 'Dust', 'Chemical', 'Heat Stress', 'Ergonomic', 'Vibration', 'None'] }),
      f('restrictions', 'Work Restrictions', 'textarea'),
      f('confidential', 'Confidential Record', 'checkbox')
    ]
  },
  {
    key: 'contractors',
    table: 'contractor_records',
    name: 'Contractor Management',
    short: 'Contractors',
    prefix: 'CTR',
    group: 'Workforce & PPE',
    icon: '🏗',
    description: 'Contractor registration, HSE evaluation, safety score and document verification.',
    statuses: ['draft', 'pending_approval', 'approved', 'active', 'suspended', 'closed'],
    readRoles: FIELD_STAFF,
    writeRoles: FIELD_STAFF,
    approveRoles: MANAGERS,
    fields: [
      f('contractor_name', 'Contractor Name', 'text', { required: true, search: true }),
      f('work_scope', 'Work Scope', 'text'),
      f('workers_count', 'Workers Deployed', 'number'),
      f('safety_score', 'HSE Safety Score (0-100)', 'number'),
      f('evaluation_date', 'Evaluation Date', 'date'),
      f('documents_verified', 'Documents Verified', 'select', { options: ['Yes', 'No', 'Partial'] }),
      f('licence_no', 'Licence / Registration No.', 'text'),
      f('insurance_valid_till', 'Insurance Valid Till', 'date')
    ]
  },
  {
    key: 'employees',
    table: 'employee_records',
    name: 'Workforce Register',
    short: 'Workforce',
    prefix: 'EMP',
    group: 'Workforce & PPE',
    icon: '👷',
    description: 'Employee and worker register with induction, competency verification and PPE status.',
    statuses: ['draft', 'approved', 'active', 'inactive'],
    readRoles: FIELD_STAFF,
    writeRoles: FIELD_STAFF,
    approveRoles: MANAGERS,
    fields: [
      f('employee_name', 'Employee Name', 'text', { required: true, search: true }),
      f('designation', 'Designation', 'text'),
      f('department', 'Department / Trade', 'text', { search: true }),
      f('contractor_name', 'Contractor', 'text'),
      f('induction_date', 'Induction Date', 'date'),
      f('competency', 'Competency Verified', 'select', { options: ['Verified', 'Pending', 'Expired'] }),
      f('ppe_issued', 'PPE Issued', 'select', { options: ['Yes', 'No', 'Partial'] }),
      f('project_site', 'Project / Site', 'text')
    ]
  },
  {
    key: 'manhours',
    table: 'manhours',
    name: 'Man-hours Register',
    short: 'Man-hours',
    prefix: 'MH',
    group: 'Workforce & PPE',
    icon: '⏱',
    description: 'Monthly exposure hours used for LTIFR, TRIR and severity rate calculation.',
    statuses: ['draft', 'approved', 'closed'],
    readRoles: FIELD_STAFF,
    writeRoles: HSE_STAFF,
    approveRoles: MANAGERS,
    fields: [
      f('month', 'Month (YYYY-MM)', 'text', { required: true, search: true }),
      f('employees_count', 'Own Employees', 'number'),
      f('contractors_count', 'Contractors', 'number'),
      f('hours_worked', 'Total Man-hours Worked', 'number', { required: true }),
      f('safe_hours', 'Safe Man-hours', 'number')
    ]
  },
  {
    key: 'moc',
    table: 'moc_requests',
    name: 'Management of Change & PSSR',
    short: 'MOC',
    prefix: 'MOC',
    group: 'Operations Control',
    icon: '🔄',
    description: 'Change requests with risk assessment, technical/safety review, PSSR and final authorization.',
    statuses: ['draft', 'pending_approval', 'approved', 'rejected', 'closed'],
    readRoles: FIELD_STAFF,
    writeRoles: HSE_STAFF,
    approveRoles: MANAGERS,
    fields: [
      f('change_type', 'Change Type', 'select', { options: ['Process', 'Equipment', 'Facility', 'Procedure', 'Organisation', 'Chemical'] }),
      f('reason', 'Reason for Change', 'textarea', { required: true }),
      f('risk_assessment_done', 'Change Risk Assessment', 'select', { options: ['Yes', 'No', 'Pending'] }),
      f('technical_review', 'Technical Review', 'select', { options: ['Approved', 'Rejected', 'Pending'] }),
      f('safety_review', 'Safety Review', 'select', { options: ['Approved', 'Rejected', 'Pending'] }),
      f('pssr_required', 'PSSR Required', 'select', { options: ['Yes', 'No'] }),
      f('pssr_status', 'PSSR Status', 'select', { options: ['Not Started', 'In Progress', 'Completed', 'Not Applicable'] }),
      f('action_closure', 'Action Closure', 'textarea'),
      f('final_authorization', 'Final Authorization', 'select', { options: ['Authorized', 'Pending', 'Refused'] }),
      f('effective_date', 'Effective Date', 'date')
    ]
  },
  {
    key: 'lifting',
    table: 'lifting_plans',
    name: 'Lifting & Rigging',
    short: 'Lifting',
    prefix: 'LFT',
    group: 'Operations Control',
    icon: '🏗',
    description: 'Lifting plans, crane capacity utilisation, rigging gear and operator competency checks.',
    statuses: ['draft', 'pending_approval', 'approved', 'closed'],
    readRoles: FIELD_STAFF,
    writeRoles: FIELD_STAFF,
    approveRoles: MANAGERS,
    fields: [
      f('load_description', 'Load Description', 'text', { required: true, search: true }),
      f('load_weight', 'Load Weight (T)', 'number', { required: true }),
      f('crane_id', 'Crane ID', 'text'),
      f('crane_capacity', 'Crane Capacity (T)', 'number'),
      f('utilization_pct', 'Capacity Utilisation %', 'number'),
      f('rigging_gear', 'Rigging Gear / Accessories', 'textarea'),
      f('operator_competency', 'Operator Competency', 'select', { options: ['Valid', 'Expired', 'Pending'] }),
      f('rigger_competency', 'Rigger Competency', 'select', { options: ['Valid', 'Expired', 'Pending'] }),
      f('signalman', 'Signalman', 'text'),
      f('ground_condition', 'Ground Condition', 'select', { options: ['Good', 'Requires Matting', 'Poor'] }),
      f('critical_lift', 'Critical Lift', 'select', { options: ['Yes', 'No'] }),
      f('lift_date', 'Lift Date', 'date')
    ]
  },
  {
    key: 'equipment',
    table: 'equipment_records',
    name: 'Equipment Safety',
    short: 'Equipment',
    prefix: 'EQP',
    group: 'Operations Control',
    icon: '⚙',
    description: 'Equipment inspection, certification and next-due tracking with expiry alerts.',
    statuses: ['draft', 'approved', 'active', 'out_of_service', 'closed'],
    readRoles: FIELD_STAFF,
    writeRoles: FIELD_STAFF,
    approveRoles: MANAGERS,
    fields: [
      f('equipment_name', 'Equipment Name', 'text', { required: true, search: true }),
      f('equipment_id', 'Equipment ID', 'text', { search: true }),
      f('inspection_type', 'Inspection / Test Type', 'select', {
        options: ['Third Party Inspection', 'Statutory Test', 'Preventive Maintenance', 'Calibration', 'Daily Check']
      }),
      f('last_inspection', 'Last Inspection', 'date'),
      f('next_due', 'Next Due', 'date'),
      f('certificate_no', 'Certificate / Report No.', 'text'),
      f('inspector', 'Inspector / Agency', 'text'),
      f('condition', 'Condition', 'select', { options: ['Good', 'Monitor', 'Out of Service'] })
    ]
  },
  {
    key: 'fire',
    table: 'fire_equipment',
    name: 'Fire & Emergency',
    short: 'Fire',
    prefix: 'FIRE',
    group: 'Fire & Emergency',
    icon: '🧯',
    description: 'Extinguisher/hydrant/alarm register, inspection due dates, refills and assembly points.',
    statuses: ['draft', 'approved', 'active', 'expired', 'closed'],
    readRoles: FIELD_STAFF,
    writeRoles: FIELD_STAFF,
    approveRoles: MANAGERS,
    fields: [
      f('item_type', 'Item Type', 'select', {
        required: true,
        options: ['Fire Extinguisher', 'Fire Hydrant', 'Fire Alarm', 'Emergency Equipment', 'Assembly Point', 'Rescue Equipment']
      }),
      f('location', 'Location', 'text', { required: true, search: true }),
      f('capacity', 'Capacity / Specification', 'text'),
      f('last_inspection', 'Last Inspection', 'date'),
      f('next_due', 'Next Inspection Due', 'date'),
      f('refill_date', 'Last Refill / Test', 'date'),
      f('condition', 'Condition', 'select', { options: ['OK', 'Service Required', 'Expired'] })
    ]
  },
  {
    key: 'drills',
    table: 'emergency_drills',
    name: 'Emergency Drills',
    short: 'Drills',
    prefix: 'DRL',
    group: 'Fire & Emergency',
    icon: '🚒',
    description: 'Mock drill planning, participation, response time and effectiveness evaluation.',
    statuses: ['draft', 'pending_approval', 'approved', 'closed'],
    readRoles: FIELD_STAFF,
    writeRoles: FIELD_STAFF,
    approveRoles: MANAGERS,
    fields: [
      f('drill_type', 'Drill Type', 'select', {
        required: true,
        options: ['Fire Drill', 'Evacuation Drill', 'Rescue Drill', 'Chemical Spill Drill', 'Medical Emergency Drill']
      }),
      f('drill_date', 'Drill Date', 'date', { required: true }),
      f('participants', 'Participants', 'number'),
      f('response_time_sec', 'Response Time (sec)', 'number'),
      f('observations', 'Observations & Learnings', 'textarea'),
      f('effectiveness', 'Effectiveness', 'select', { options: ['Effective', 'Needs Improvement'] })
    ]
  },
  {
    key: 'construction',
    table: 'construction_activities',
    name: 'Construction Safety',
    short: 'Construction',
    prefix: 'CSM',
    group: 'Operations Control',
    icon: '🏢',
    description: 'Activity-wise construction safety checks: excavation, scaffolding, height, confined space, SIMOPS.',
    statuses: ['draft', 'pending_approval', 'approved', 'closed'],
    readRoles: FIELD_STAFF,
    writeRoles: FIELD_STAFF,
    approveRoles: MANAGERS,
    fields: [
      f('activity_type', 'Activity Type', 'select', {
        required: true,
        options: [
          'Excavation', 'Scaffolding', 'Work at Height', 'Lifting & Rigging', 'Confined Space',
          'Hot Work', 'Electrical', 'Formwork', 'Demolition', 'Road & Traffic', 'Manual Handling',
          'Machine Guarding', 'Pressure Testing', 'Chemical Handling', 'Night Shift', 'SIMOPS'
        ]
      }),
      f('area', 'Area / Location', 'text', { search: true }),
      f('checklist_score', 'Checklist Compliance %', 'number'),
      f('findings', 'Findings', 'textarea'),
      f('permit_ref', 'Linked Permit No.', 'text'),
      f('responsible', 'Responsible Person', 'text'),
      f('inspection_date', 'Inspection Date', 'date')
    ]
  },
  {
    key: 'legal',
    table: 'legal_compliance',
    name: 'Legal Compliance Register',
    short: 'Legal',
    prefix: 'LGL',
    group: 'Compliance',
    icon: '⚖',
    description: 'Applicable legal requirements with clause reference, applicability, evidence and review date.',
    statuses: ['draft', 'approved', 'compliant', 'non_compliant', 'closed'],
    readRoles: FIELD_STAFF,
    writeRoles: HSE_STAFF,
    approveRoles: MANAGERS,
    fields: [
      f('act_regulation', 'Act / Regulation / Standard', 'text', { required: true, search: true }),
      f('clause_reference', 'Clause / Section Reference', 'text'),
      f('requirement', 'Requirement Summary', 'textarea', { required: true }),
      f('applicable_to', 'Applicability', 'text'),
      f('compliance_status', 'Compliance Status', 'select', {
        options: ['Compliant', 'Partially Compliant', 'Non-compliant', 'Not Applicable']
      }),
      f('evidence', 'Evidence / Records', 'textarea'),
      f('review_date', 'Next Review Date', 'date'),
      f('source_reference', 'Source Reference', 'text')
    ]
  }
];

export const MODULE_MAP = new Map(MODULES.map((m) => [m.key, m]));

export const getModule = (key) => MODULE_MAP.get(key) || null;

export const moduleFieldNames = (m) => m.fields.map((x) => x.name);

export const canRead = (user, m) => {
  if (!user) return false;
  if (m.readRoles === 'all') return true;
  return m.readRoles.includes(user.role);
};

export const canWrite = (user, m) => {
  if (!user) return false;
  if (m.writeRoles === 'all') return true;
  return m.writeRoles.includes(user.role);
};

export const canApprove = (user, m) => {
  if (!user) return false;
  return m.approveRoles.includes(user.role);
};

export const isAdminRole = (role) => role === 'admin' || role === 'super_admin';
