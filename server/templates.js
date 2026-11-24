/**
 * SURAJ SAFETY HERO - Safety document template library.
 * 50 editable HSE document formats. Blank templates carry [placeholders];
 * nothing here is presented as an approved company procedure.
 */

const t = (key, title, category, code, sections) => ({ key, title, category, code, sections });

export const TEMPLATES = [
  t('hse_policy', 'HSE Policy', 'Policy & Plans', 'POL', [
    ['Purpose', 'This policy defines [Company Name] commitment to protect the health, safety and environment of all employees, contractors, visitors and the community at [Project / Site].'],
    ['Policy Statement', 'We are committed to: (1) providing safe plant, equipment and systems of work; (2) identifying hazards and controlling risk to as low as reasonably practicable; (3) complying with applicable legal and other requirements; (4) consulting and training workers; (5) continual improvement of the HSE management system.'],
    ['Responsibilities', 'Management: [Insert]. HSE Manager: [Insert]. Line supervisors: [Insert]. All workers: comply with rules, report hazards and use PPE.'],
    ['Review', 'This policy is reviewed at least annually and after any significant change. Next review date: [Insert].'],
    ['Authorization', 'Prepared by: [Name / Designation]. Approved by: [Name / Designation]. Signature and date: [Insert].']
  ]),
  t('hse_plan', 'HSE Plan', 'Policy & Plans', 'PLN', [
    ['Project Information', 'Project: [Insert]. Client: [Insert]. Location: [Insert]. Duration: [Insert]. Peak manpower: [Insert].'],
    ['HSE Objectives and Targets', 'LTIFR target: [Insert]. TRIR target: [Insert]. Training compliance target: [Insert]%. Inspection closure target: [Insert]%.'],
    ['Organisation and Responsibilities', 'HSE organisation chart with names, designations and contact numbers: [Insert].'],
    ['HSE Procedures', 'Permit to work, LOTO, incident reporting, inspection, training, emergency response, PPE and environmental control procedures applicable to this project: [List].'],
    ['Monitoring and Reporting', 'Daily inspection, weekly walkthrough, monthly HSE report, quarterly management review. Responsible: [Insert].'],
    ['Emergency Preparedness', 'Emergency response plan reference: [Insert]. Assembly points: [Insert]. Mutual aid arrangements: [Insert].']
  ]),
  t('hse_manual', 'HSE Manual', 'Policy & Plans', 'MAN', [
    ['Scope of the HSE Management System', 'This manual describes the HSE management system implemented at [Company / Site] in accordance with ISO 45001 and ISO 14001 principles.'],
    ['Context and Interested Parties', 'Interested parties: workers, contractors, clients, regulators, community. Requirements and expectations: [Insert].'],
    ['Leadership and Worker Participation', 'HSE leadership commitments, safety committee structure and worker consultation mechanism: [Insert].'],
    ['Planning', 'Hazard identification, legal register, HSE objectives and planning action: [Insert].'],
    ['Support and Operation', 'Resources, competence, awareness, communication, documented information and operational controls: [Insert].'],
    ['Performance Evaluation and Improvement', 'Monitoring, measurement, internal audit, management review, incident investigation and continual improvement: [Insert].']
  ]),
  t('hse_ms', 'HSE Management System', 'Policy & Plans', 'HMS', [
    ['System Architecture', 'Element-wise HSE management system with documented procedures, formats and records: [Insert].'],
    ['Document Control', 'Numbering, revision, issue, distribution and retention rules: [Insert].'],
    ['Risk Management Process', 'HIRA, JSA, permit to work, management of change and PSSR integration: [Insert].'],
    ['Audit and Review', 'Audit frequency, auditor competence, corrective action and management review: [Insert].']
  ]),
  t('smp', 'Safety Management Plan', 'Policy & Plans', 'SMP', [
    ['Introduction', 'This safety management plan covers [Scope of Work] at [Site] and applies to [Company] and all subcontractors.'],
    ['Legal and Other Requirements', 'Applicable Acts, Rules, Codes and client requirements: [Insert with reference and version].'],
    ['Hazard Management', 'HIRA and JSA methodology, risk matrix, approval and review cycle: [Insert].'],
    ['Competency and Training', 'Induction, job-specific training and competency verification: [Insert].'],
    ['Performance Monitoring', 'KPIs, inspections, audits and reporting frequency: [Insert].']
  ]),
  t('risk_assessment', 'Risk Assessment', 'Risk & JSA', 'RA', [
    ['Activity Description', 'Activity: [Insert]. Location: [Insert]. Persons exposed: [Insert]. Duration: [Insert].'],
    ['Risk Matrix', 'Severity 1-5 x Likelihood 1-5. 1-4 Low, 5-9 Medium, 10-15 High, 16-25 Critical.'],
    ['Hazards and Consequences', '| Hazard | Consequence | Severity | Likelihood | Score | Band | Control measures | Residual score | Responsible |'],
    ['Hierarchy of Controls', 'Elimination, substitution, engineering, administrative and PPE controls applied: [Insert].'],
    ['Approval', 'Prepared by: [Insert]. Reviewed by: [Insert]. Approved by: [Insert]. Review date: [Insert].']
  ]),
  t('hira', 'HIRA Format', 'Risk & JSA', 'HIRA', [
    ['Register Header', 'HIRA register for [Area / Activity] at [Site]. Register No: [Auto]. Revision: [Insert].'],
    ['Register Columns', 'Sr. No | Activity | Hazard | Consequence | Initial S x L = Risk | Control measures | Residual S x L = Risk | Responsible | Review date'],
    ['Risk Criteria', 'Acceptability criteria and escalation rules: [Insert].'],
    ['Review Cycle', 'HIRA reviewed annually, after incidents, and after any management of change: [Insert].']
  ]),
  t('jsa', 'JSA Format', 'Risk & JSA', 'JSA', [
    ['Job Information', 'Job / Activity: [Insert]. Location: [Insert]. Crew: [Insert]. Date: [Insert].'],
    ['Job Steps and Hazards', '| Step | Hazard | Consequence | Control measure | Required PPE | Responsible |'],
    ['Authorization', 'Supervisor: [Insert]. Safety approval: [Insert]. Crew briefing attendance: [Insert].'],
    ['Revision History', 'Rev A - initial issue. Rev B - [Change description and reason].']
  ]),
  t('method_statement', 'Method Statement', 'Risk & JSA', 'MS', [
    ['Scope of Work', 'This method statement describes [Activity] at [Location] including resources, sequence and controls.'],
    ['Sequence of Work', 'Step 1 [Insert]. Step 2 [Insert]. Step 3 [Insert]. Step 4 [Insert].'],
    ['Resources and Plant', 'Manpower: [Insert]. Equipment: [Insert]. Competency certificates required: [Insert].'],
    ['HSE Controls', 'Permit requirements: [Insert]. PPE: [Insert]. Isolation: [Insert]. Emergency arrangement: [Insert].'],
    ['Approval', 'Prepared by: [Insert]. Reviewed by: [Insert]. Approved by: [Insert]. Date: [Insert].']
  ]),
  t('swms', 'Safe Work Method Statement', 'Risk & JSA', 'SWMS', [
    ['Work Activity', 'SWMS for [High-risk construction work] at [Site].'],
    ['High Risk Construction Work Identification', 'Work at height / excavation / confined space / hot work / lifting: [Select applicable].'],
    ['Risk Controls', '| Task | Hazard | Risk | Control | Responsible |'],
    ['Worker Consultation and Sign-off', 'Workers consulted: [Names]. Signature and date: [Insert].']
  ]),
  t('sop', 'Standard Operating Procedure', 'Risk & JSA', 'SOP', [
    ['Purpose and Scope', 'This SOP defines the safe procedure for [Operation] at [Area].'],
    ['Prerequisites', 'Authorization, training, PPE, permits, isolation and tools required before starting: [Insert].'],
    ['Procedure Steps', '1. [Insert]. 2. [Insert]. 3. [Insert]. 4. [Insert]. 5. [Insert].'],
    ['Emergency Actions', 'On abnormal condition: stop, isolate, inform [Designation], follow emergency plan [Reference].'],
    ['Records', 'Records generated by this SOP and retention period: [Insert].']
  ]),
  t('ptw', 'Permit to Work Format', 'Permit & Isolation', 'PTW', [
    ['Permit Details', 'Permit No: [Auto]. Category: [Hot / Cold / Confined Space / Height / Electrical / Excavation / Lifting / Line Breaking / Radiography / General]. Validity: [From - To].'],
    ['Work Description and Location', 'Describe the work, equipment and area: [Insert]. Contractor and permit receiver: [Insert].'],
    ['Hazard Checklist', 'Hazards identified and controls verified: [List with yes/no/na].'],
    ['Isolation and Gas Testing', 'Isolation certificate reference: [Insert]. Gas test results - O2: [Insert]%, LEL: [Insert]%, toxic: [Insert] ppm. Tested by: [Insert].'],
    ['Authorization', 'Issuer: [Insert]. Receiver: [Insert]. Area authority: [Insert]. Safety: [Insert]. Signatures and time: [Insert].'],
    ['Closure', 'Work completed, area made safe, tools removed, permit closed at [Time] by [Name]. Extension history: [Insert].']
  ]),
  t('loto', 'LOTO Procedure', 'Permit & Isolation', 'LOTO', [
    ['Purpose', 'This procedure prevents unexpected energisation or release of stored energy during [Maintenance / Repair] of [Equipment].'],
    ['Energy Sources', 'Electrical, mechanical, hydraulic, pneumatic, thermal, chemical, gravity and stored energy identified for this equipment: [Insert].'],
    ['Isolation Sequence', 'Notify affected persons, shutdown, isolate, lock and tag, release stored energy, verify zero energy: [Insert].'],
    ['Verification', 'Zero energy verification method and authorized person: [Insert].'],
    ['De-isolation', 'Inspection completed, tools removed, personnel clear, locks removed in reverse order by the person who applied them: [Insert].']
  ]),
  t('erp', 'Emergency Response Plan', 'Emergency', 'ERP', [
    ['Site and Emergency Information', 'Site: [Insert]. Emergency control room: [Insert]. Nearest hospital: [Insert with distance]. Ambulance: [Insert].'],
    ['Emergency Scenarios', 'Fire, explosion, chemical release, structural collapse, medical emergency, natural disaster, security threat: [Insert applicable].'],
    ['Response Organisation', 'Incident controller, fire team, rescue team, first aid team, security, utilities: [Names and contacts].'],
    ['Alarm and Evacuation', 'Alarm signals, evacuation routes, assembly points and headcount procedure: [Insert].'],
    ['Drills and Review', 'Drill frequency, scenario, participants, evaluation and plan update: [Insert].']
  ]),
  t('rescue_plan', 'Rescue Plan', 'Emergency', 'RSP', [
    ['Scope', 'Rescue plan for [Confined space entry / Work at height / Excavation] at [Location].'],
    ['Rescue Team and Equipment', 'Team members, competence, tripod/retrieval system, SCBA, stretcher, communication: [Insert].'],
    ['Rescue Procedure', 'Step-by-step non-entry and entry rescue sequence: [Insert].'],
    ['Medical Support', 'First aider on standby, ambulance arrangement, hospital route: [Insert].'],
    ['Drill Record', 'Rescue drill date, participants, response time and findings: [Insert].']
  ]),
  t('fire_plan', 'Fire Safety Plan', 'Emergency', 'FSP', [
    ['Fire Risk Assessment', 'Fire load, ignition sources, occupancy and compartmentation: [Insert].'],
    ['Fire Protection Systems', 'Extinguishers, hydrants, sprinklers, alarms, detection and smoke management: [Insert].'],
    ['Prevention Controls', 'Hot work permit, housekeeping, storage limits, electrical safety, no-smoking zones: [Insert].'],
    ['Response and Evacuation', 'Alarm response, fire team duties, evacuation routes, assembly points: [Insert].'],
    ['Inspection and Testing', 'Monthly extinguisher check, quarterly hydrant flow test, annual alarm test: [Insert].']
  ]),
  t('incident_report', 'Incident Report', 'Incident & Investigation', 'IR', [
    ['Incident Details', 'Incident No: [Auto]. Date and time: [Insert]. Location: [Insert]. Type: [Near miss / First aid / MTC / LTI / Fatality / Property damage / Fire / Environmental].'],
    ['Description of Event', 'Sequence of events as observed (facts only, no opinion): [Insert].'],
    ['Persons Involved', 'Name, designation, contractor, nature of injury and body part: [Insert].'],
    ['Immediate Actions', 'First aid, medical treatment, scene preservation, notification to [Authority]: [Insert].'],
    ['Initial Cause Assessment', 'Immediate cause, contributing factors and suspected root cause: [Insert].'],
    ['Reported By', 'Name and designation: [Insert]. Reviewed by HSE: [Insert].']
  ]),
  t('near_miss_report', 'Near Miss Report', 'Incident & Investigation', 'NMR', [
    ['Event Description', 'What happened and what could have happened: [Insert].'],
    ['Location and Time', 'Area: [Insert]. Date and time: [Insert]. Reported by: [Insert].'],
    ['Potential Consequence', 'Worst credible outcome and risk rating: [Insert].'],
    ['Immediate Action', 'Correction applied at site: [Insert].'],
    ['Follow-up Action', 'CAPA reference and owner: [Insert].']
  ]),
  t('accident_investigation', 'Accident Investigation Report', 'Incident & Investigation', 'AIR', [
    ['Investigation Team', 'Team leader, members, competence and independence: [Insert].'],
    ['Evidence Collected', 'Photographs, witness statements, documents, equipment records, CCTV, sketches: [Insert].'],
    ['Event Timeline', 'Chronological sequence with time stamps: [Insert].'],
    ['Causal Analysis', 'Immediate causes, contributing factors, root causes using 5 Why and fishbone: [Insert].'],
    ['Recommendations', 'Corrective and preventive actions with owner and target date: [Insert].'],
    ['Approval', 'Investigation lead: [Insert]. HSE Manager: [Insert]. Management: [Insert].']
  ]),
  t('rca', 'Root Cause Analysis', 'Incident & Investigation', 'RCA', [
    ['Problem Statement', 'What happened, where, when and impact: [Insert].'],
    ['5 Why Analysis', 'Why 1: [Insert]. Why 2: [Insert]. Why 3: [Insert]. Why 4: [Insert]. Why 5 (root cause): [Insert].'],
    ['Fishbone Categories', 'Man, Machine, Material, Method, Measurement, Environment - contributing factors: [Insert].'],
    ['Root Causes Identified', 'System and organisational root causes: [Insert].'],
    ['Actions', 'Corrective and preventive actions with owner, date and verification method: [Insert].']
  ]),
  t('capa_report', 'CAPA Report', 'Incident & Investigation', 'CAPA', [
    ['Source', 'Incident / inspection / audit / observation reference: [Insert].'],
    ['Finding', 'Nonconformity or deficiency statement: [Insert].'],
    ['Root Cause', 'Analysis result: [Insert].'],
    ['Corrective Action', 'Action, owner, target date, resources: [Insert].'],
    ['Preventive Action', 'System-level change to prevent recurrence: [Insert].'],
    ['Verification of Effectiveness', 'Method, verifier, date and result: [Insert].']
  ]),
  t('daily_report', 'Daily HSE Report', 'Reports & MIS', 'DHR', [
    ['Manpower and Man-hours', 'Own employees: [Insert]. Contractors: [Insert]. Man-hours today: [Insert]. Cumulative: [Insert].'],
    ['Activities and Permits', 'High-risk activities and permits issued today: [Insert].'],
    ['Inspections and Observations', 'Inspections carried out, findings and closures: [Insert].'],
    ['Incidents and First Aid', 'Incidents, near misses, first aid cases: [Insert].'],
    ['Key Issues and Actions', 'Open issues requiring management attention: [Insert].']
  ]),
  t('weekly_report', 'Weekly HSE Report', 'Reports & MIS', 'WHR', [
    ['Week Summary', 'Week number and date range: [Insert]. Man-hours: [Insert].'],
    ['HSE Statistics', 'Incidents: [Insert]. Near misses: [Insert]. Observations: [Insert]. Inspections: [Insert]. CAPA open/closed: [Insert].'],
    ['Training and Toolbox Talks', 'Sessions conducted, attendance and topics: [Insert].'],
    ['Key Findings', 'Critical findings and corrective actions: [Insert].'],
    ['Plan for Next Week', 'Focus areas, audits and training planned: [Insert].']
  ]),
  t('monthly_report', 'Monthly HSE Report', 'Reports & MIS', 'MHR', [
    ['Executive Summary', 'Month: [Insert]. Overall HSE performance and trend: [Insert].'],
    ['Man-hours and Exposure', 'Total man-hours: [Insert]. Safe man-hours: [Insert].'],
    ['Incident Statistics', 'LTI: [Insert]. MTC: [Insert]. FAC: [Insert]. Near miss: [Insert]. Fatality: [Insert].'],
    ['Performance Indices', 'LTIFR = (LTI x 1,000,000) / man-hours. TRIR = (recordable cases x 200,000) / man-hours. Severity rate = (lost days x 1,000,000) / man-hours. Values: [Insert].'],
    ['Compliance Status', 'Training compliance: [Insert]%. PPE compliance: [Insert]%. Inspection compliance: [Insert]%. CAPA closure: [Insert]%.'],
    ['Key Initiatives and Concerns', 'Initiatives delivered and support required: [Insert].']
  ]),
  t('annual_report', 'Annual HSE Report', 'Reports & MIS', 'AHR', [
    ['Year Overview', 'Year: [Insert]. Projects covered: [Insert]. Total man-hours: [Insert].'],
    ['Annual Statistics', 'Incidents, near misses, LTI, severity, LTIFR, TRIR: [Insert].'],
    ['Objective Achievement', 'Targets versus actuals for all HSE objectives: [Insert].'],
    ['Audit and Legal Compliance', 'Audits completed, nonconformities, legal compliance status: [Insert].'],
    ['Improvement Plan', 'Next year objectives, initiatives and budget: [Insert].']
  ]),
  t('hse_mis', 'HSE MIS Format', 'Reports & MIS', 'MIS', [
    ['MIS Structure', 'Project-wise, month-wise HSE data with formulas and source records: [Insert].'],
    ['Data Fields', 'Man-hours, incidents by type, lost days, training, inspections, observations, CAPA, PPE, audits: [Insert].'],
    ['Formula Sheet', 'Document all KPI formulas and data owners: [Insert].'],
    ['Submission Schedule', 'Monthly submission date and reviewer: [Insert].']
  ]),
  t('inspection_format', 'Safety Inspection Format', 'Inspection Checklists', 'INS', [
    ['Inspection Details', 'Inspection No: [Auto]. Type: [Insert]. Area: [Insert]. Inspector: [Insert]. Date: [Insert].'],
    ['Checklist', '| Item | Requirement | Status (C/NC/NA) | Observation | Action |'],
    ['Scoring', 'Score = (compliant items / applicable items) x 100. Compliance %: [Insert].'],
    ['Findings and Actions', 'Critical findings, responsible persons and target dates: [Insert].']
  ]),
  t('safety_audit', 'Safety Audit Report', 'Compliance & Audit', 'AUD', [
    ['Audit Scope and Criteria', 'Scope: [Insert]. Criteria: ISO 45001, legal requirements, client specification, internal procedures.'],
    ['Audit Team and Schedule', 'Lead auditor and team, audit dates, areas covered: [Insert].'],
    ['Nonconformities', 'Major NC, minor NC and observations with evidence: [Insert].'],
    ['Strengths and Opportunities', 'Good practices identified: [Insert].'],
    ['Conclusion and Follow-up', 'Audit conclusion, CAPA requirement and verification date: [Insert].']
  ]),
  t('observation_card', 'Safety Observation Card', 'Registers & Records', 'OBS', [
    ['Observation Details', 'Observer: [Insert]. Date and time: [Insert]. Area: [Insert].'],
    ['Type', 'Unsafe act / Unsafe condition / Safe behaviour: [Select].'],
    ['Description', 'What was observed, with photograph reference: [Insert].'],
    ['Immediate Action', 'Correction applied and persons involved: [Insert].'],
    ['Follow-up', 'Action owner, target date and closure verification: [Insert].']
  ]),
  t('toolbox_talk', 'Toolbox Talk Format', 'Training & Competency', 'TBT', [
    ['Talk Details', 'Topic: [Insert]. Date: [Insert]. Conducted by: [Insert]. Language: [Hindi / English / Bilingual].'],
    ['Key Messages', 'Three to five key safety messages for the crew: [Insert].'],
    ['Hazards Discussed', 'Site-specific hazards and controls for today\'s work: [Insert].'],
    ['Attendance', 'Name, designation, contractor and signature of each attendee: [Insert].'],
    ['Effectiveness Check', 'Questions asked and worker understanding confirmed: [Insert].']
  ]),
  t('training_register', 'Training Register', 'Training & Competency', 'TRG', [
    ['Register Information', 'Training register for [Site / Department]. Year: [Insert].'],
    ['Columns', 'Date | Topic | Trainer | Duration | Attendees | Evaluation score | Certificate no | Valid till'],
    ['Competency Matrix', 'Trade-wise required trainings and validity: [Insert].'],
    ['Expiry Monitoring', 'Alert mechanism for training expiry: [Insert].']
  ]),
  t('ppe_register', 'PPE Register', 'Registers & Records', 'PPER', [
    ['Issue Register Columns', 'Employee | ID | PPE item | Size | Quantity | Issue date | Replacement due | Signature'],
    ['Inventory Control', 'Minimum stock levels, storage condition and inspection: [Insert].'],
    ['Inspection and Replacement', 'Inspection criteria and replacement rules for helmets, harnesses, respirators: [Insert].'],
    ['Disposal', 'Damaged PPE withdrawal and disposal record: [Insert].']
  ]),
  t('contractor_evaluation', 'Contractor Safety Evaluation', 'Compliance & Audit', 'CSE', [
    ['Contractor Profile', 'Name, licence, scope, manpower, insurance validity: [Insert].'],
    ['Evaluation Criteria', 'HSE organisation, training, PPE, equipment, incident history, audit performance: [Insert].'],
    ['Scoring', 'Weightage and score out of 100: [Insert]. Result: [Insert].'],
    ['Improvement Plan', 'Deficiencies and agreed improvement actions: [Insert].']
  ]),
  t('lifting_plan', 'Lifting Plan', 'Operations', 'LFT', [
    ['Lift Details', 'Load description, weight, dimensions, centre of gravity: [Insert].'],
    ['Crane Selection', 'Crane model, capacity, radius, boom length, utilisation %: [Insert].'],
    ['Rigging Arrangement', 'Sling type, capacity, shackles, angle, D/d ratio: [Insert].'],
    ['Ground and Environment', 'Ground bearing capacity, matting, wind speed limit, exclusion zone: [Insert].'],
    ['Competency and Approval', 'Operator, rigger, signalman competency certificates; lifting supervisor approval: [Insert].']
  ]),
  t('scaffolding_inspection', 'Scaffolding Inspection', 'Inspection Checklists', 'SCF', [
    ['Scaffold Details', 'Location, height, type, load class, scaffold ID tag: [Insert].'],
    ['Inspection Points', 'Foundation, standards, ledgers, bracing, ties, platforms, guardrails, toe boards, access, tags: [Insert].'],
    ['Result', 'Safe to use / Not safe - reasons: [Insert]. Inspected by: [Insert]. Valid till: [Insert].'],
    ['Re-inspection', 'Frequency and after alteration or adverse weather: [Insert].']
  ]),
  t('ladder_inspection', 'Ladder Inspection', 'Inspection Checklists', 'LDR', [
    ['Ladder Details', 'ID, type, material, length, location: [Insert].'],
    ['Inspection Points', 'Stiles, rungs, feet, locking mechanism, labels, damage: [Insert].'],
    ['Result and Tag', 'Pass / Fail, tag colour, inspector and date: [Insert].']
  ]),
  t('excavation_checklist', 'Excavation Checklist', 'Inspection Checklists', 'EXC', [
    ['Excavation Details', 'Location, depth, width, duration, soil type: [Insert].'],
    ['Pre-work Checks', 'Underground utility survey, permit, shoring/benching, access/egress, barricading, signage, spoil distance: [Insert].'],
    ['Daily Checks', 'Inspection of sides, water accumulation, gas test if deep, edge protection: [Insert].'],
    ['Emergency Arrangement', 'Rescue equipment and contact: [Insert].']
  ]),
  t('confined_space_checklist', 'Confined Space Checklist', 'Inspection Checklists', 'CSC', [
    ['Entry Details', 'Space identification, entry purpose, entrants, attendants, supervisor: [Insert].'],
    ['Pre-entry Requirements', 'Isolation, cleaning, purging, gas test (O2, LEL, toxic), ventilation, rescue plan: [Insert].'],
    ['Gas Test Record', 'Time, O2 %, LEL %, H2S ppm, CO ppm, tester: [Insert].'],
    ['Continuous Monitoring', 'Frequency of retest and communication method: [Insert].'],
    ['Exit and Closure', 'Headcount, equipment retrieval, permit closure: [Insert].']
  ]),
  t('electrical_checklist', 'Electrical Safety Checklist', 'Inspection Checklists', 'ELC', [
    ['Installation Details', 'Area, equipment, voltage, capacity: [Insert].'],
    ['Checks', 'Earthing, ELCB/RCCB, cable condition, plugs, IP rating, panel locking, signage, authorized person: [Insert].'],
    ['Temporary Supply', 'Distribution board, cable routing, protection and inspection tag: [Insert].'],
    ['Findings and Action', 'Nonconformities and responsible person: [Insert].']
  ]),
  t('welding_checklist', 'Welding and Gas Cutting Checklist', 'Inspection Checklists', 'WLD', [
    ['Work Details', 'Location, permit number, welder qualification: [Insert].'],
    ['Checks', 'Fire watch, fire extinguisher, screens, ventilation, gas cylinder handling, flashback arrestor, hose condition, PPE: [Insert].'],
    ['Post-work', 'Hot surface inspection, fire watch for 30 minutes, area handover: [Insert].']
  ]),
  t('fire_extinguisher_checklist', 'Fire Extinguisher Checklist', 'Inspection Checklists', 'FEX', [
    ['Extinguisher Register', 'ID, type, capacity, location, installation date: [Insert].'],
    ['Monthly Check', 'Pressure gauge, seal, pin, hose, nozzle, label, accessibility, mounting height: [Insert].'],
    ['Annual Service', 'Refill/test date, agency, certificate: [Insert].'],
    ['Action', 'Replacement or service required: [Insert].']
  ]),
  t('vehicle_checklist', 'Vehicle Checklist', 'Inspection Checklists', 'VEH', [
    ['Vehicle Details', 'Registration, type, driver, licence validity: [Insert].'],
    ['Checks', 'Brakes, tyres, lights, horn, mirrors, wipers, seat belts, fire extinguisher, first aid, reverse alarm, load security: [Insert].'],
    ['Result', 'Fit / Not fit for duty, defects reported: [Insert].']
  ]),
  t('housekeeping_checklist', 'Housekeeping Checklist', 'Inspection Checklists', 'HSK', [
    ['Area', 'Area inspected and responsible supervisor: [Insert].'],
    ['Checks', 'Material stacking, walkway clearance, waste segregation, spill control, cable management, illumination: [Insert].'],
    ['Scoring', 'Compliance % and grade: [Insert].'],
    ['Actions', 'Findings and closure dates: [Insert].']
  ]),
  t('first_aid_register', 'First Aid Register', 'Registers & Records', 'FAR', [
    ['Case Details', 'Date, time, name, age, contractor, nature of injury: [Insert].'],
    ['Treatment Given', 'First aid provided, by whom, medication if any: [Insert].'],
    ['Referral', 'Referred to hospital or occupational health centre: [Insert].'],
    ['Follow-up', 'Return to work status and restriction: [Insert].']
  ]),
  t('manhours_register', 'Man-hours Register', 'Registers & Records', 'MHRG', [
    ['Month and Scope', 'Month: [Insert]. Project / site: [Insert].'],
    ['Manpower', 'Own employees, contractor workers and total headcount: [Insert].'],
    ['Hours Calculation', 'Hours worked = headcount x working days x shift hours. Total: [Insert].'],
    ['Verification', 'Verified by time office and HSE: [Insert].']
  ]),
  t('legal_register', 'Legal Compliance Register', 'Compliance & Audit', 'LCR', [
    ['Register Structure', 'Act / Rule / Standard | Clause | Requirement | Applicability | Compliance status | Evidence | Review date'],
    ['Sources', 'Record the official source and version for each entry. Do not enter a clause without verifying the current text: [Insert].'],
    ['Compliance Evaluation', 'Evaluation frequency, evaluator and escalation: [Insert].'],
    ['Non-compliance Action', 'Action plan, owner and closure evidence: [Insert].']
  ]),
  t('environmental_plan', 'Environmental Management Plan', 'Environment', 'EMP', [
    ['Aspects and Impacts', 'Significant environmental aspects and impacts register: [Insert].'],
    ['Controls', 'Air, water, noise, soil, waste, spill prevention and biodiversity controls: [Insert].'],
    ['Monitoring', 'Parameters, frequency, locations and limits: [Insert].'],
    ['Statutory Approvals', 'Consent to establish/operate, hazardous waste authorization and other approvals: [Insert].'],
    ['Reporting', 'Internal reporting and submission to authorities: [Insert].']
  ]),
  t('committee_minutes', 'Safety Committee Meeting Minutes', 'Compliance & Audit', 'SCM', [
    ['Meeting Details', 'Date, time, venue, chairperson, members present: [Insert].'],
    ['Previous Minutes', 'Status of actions from the previous meeting: [Insert].'],
    ['Agenda Items', 'Incidents review, inspection findings, worker suggestions, training, legal updates: [Insert].'],
    ['Decisions and Actions', 'Action, owner and target date: [Insert].'],
    ['Next Meeting', 'Date and venue: [Insert].']
  ]),
  t('management_review', 'Management Review Format', 'Compliance & Audit', 'MRV', [
    ['Review Inputs', 'Incident trends, audit results, legal compliance, objectives, worker feedback, resource adequacy: [Insert].'],
    ['Performance Summary', 'KPIs versus targets: [Insert].'],
    ['Decisions', 'Improvement actions, resource allocation and change requirements: [Insert].'],
    ['Outputs and Owners', 'Action, owner and date: [Insert].']
  ]),
  t('pssr_checklist', 'PSSR Checklist', 'Operations', 'PSSR', [
    ['Change Reference', 'MOC number, change description and scope: [Insert].'],
    ['Pre-startup Checks', 'Construction completion, equipment inspection, instrument calibration, procedures updated, training completed, safety systems functional, emergency arrangements: [Insert].'],
    ['Punch List', 'Outstanding items and their disposition: [Insert].'],
    ['Authorization', 'PSSR team signature and startup authorization: [Insert].']
  ]),
  t('moc_format', 'MOC Format', 'Operations', 'MOC', [
    ['Change Request', 'Requested by, date, change type, description and reason: [Insert].'],
    ['Risk Assessment', 'HIRA reference, risk rating and controls: [Insert].'],
    ['Reviews', 'Technical review, safety review and environmental review outcomes: [Insert].'],
    ['Approval and Implementation', 'Approvals, implementation plan, training and communication: [Insert].'],
    ['Closure', 'Verification of implementation and PSSR reference: [Insert].']
  ]),
  t('simops', 'SIMOPS Assessment', 'Operations', 'SIMOPS', [
    ['Concurrent Activities', 'List simultaneous operations with location and timing: [Insert].'],
    ['Interface Hazards', 'Hazards arising from interaction between activities: [Insert].'],
    ['Controls', 'Segregation, permit coordination, communication protocol, shutdown requirements: [Insert].'],
    ['Authorization', 'Approved by operations and HSE: [Insert].']
  ]),
  t('industrial_hygiene', 'Industrial Hygiene Monitoring Format', 'Environment', 'IHM', [
    ['Monitoring Plan', 'Agents monitored: noise, dust, fumes, chemicals, heat. Locations and frequency: [Insert].'],
    ['Sampling Details', 'Method, instrument, calibration, duration, person sampled: [Insert].'],
    ['Results versus Limits', 'Measured value, exposure limit, % of limit: [Insert].'],
    ['Controls and Recommendations', 'Engineering, administrative and PPE controls; health surveillance link: [Insert].']
  ])
];

export const TEMPLATE_CATEGORIES = [...new Set(TEMPLATES.map((tpl) => tpl.category))];

export const TEMPLATE_MAP = new Map(TEMPLATES.map((tpl) => [tpl.key, tpl]));

export function renderTemplate(template, meta = {}) {
  const {
    docNo = 'DRAFT',
    revision = 'A',
    issueDate = '',
    reviewDate = '',
    company = '[Company Name]',
    project = '[Project / Site]',
    preparedBy = '[Prepared By]',
    checkedBy = '[Checked By]',
    approvedBy = '[Approved By]'
  } = meta;

  const header = [
    `# ${template.title}`,
    '',
    `**Document No:** ${docNo}  `,
    `**Revision:** ${revision}  `,
    `**Issue Date:** ${issueDate || '[Issue Date]'}  `,
    `**Review Date:** ${reviewDate || '[Review Date]'}  `,
    `**Company:** ${company}  `,
    `**Project / Site:** ${project}  `,
    `**Prepared By:** ${preparedBy}  `,
    `**Checked By:** ${checkedBy}  `,
    `**Approved By:** ${approvedBy}`,
    '',
    '> Controlled document. Printed copies are uncontrolled unless stamped. Review before use and adapt to actual site conditions and applicable legal requirements.',
    ''
  ].join('\n');

  const body = template.sections
    .map(([heading, text], index) => `## ${index + 1}. ${heading}\n\n${text}`)
    .join('\n\n');

  return `${header}\n${body}\n\n---\n\n**Revision History**\n\n| Rev | Date | Description | By |\n| --- | --- | --- | --- |\n| ${revision} | ${issueDate || '[Date]'} | Initial issue of this format | ${preparedBy} |\n`;
}

export function renderSample(template, meta = {}) {
  const base = renderTemplate(template, meta);
  return `${base}\n\n> SAMPLE CONTENT: This is an illustrative example for training and demonstration. It is not an approved company procedure and must be reviewed by a competent person before use.\n`;
}
