import {
  AuditLog,
  Encounter,
  Facility,
  FacilityMembership,
  Patient,
  UserProfile,
} from '../types';
import {
  DEFAULT_ROLE_PERMISSIONS,
  generateMembershipId,
  normalizeUsername,
} from '../lib/membershipService';

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calculateAge(dateOfBirth: string): number {
  if (!dateOfBirth) return 0;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return 0;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return Math.max(0, age);
}

export function maskPhoneNumber(phone: string): string {
  if (!phone || phone.length < 7) return phone || 'Not provided';
  const cleaned = phone.trim();
  const prefix = cleaned.slice(0, 7);
  const suffix = cleaned.slice(-3);
  return `${prefix} ••• ${suffix}`;
}

export function generateUniquePatientCode(existingCount: number, facilityCode?: string): string {
  const year = new Date().getFullYear();
  const seq = String(1041 + existingCount).padStart(4, '0');
  const prefix = facilityCode ? facilityCode.split('-')[0] || 'CB' : 'CB';
  return `${prefix}-NG-${year}-${seq}`;
}

export const NIGERIA_CLINICAL_DEPARTMENTS = [
  'General Outpatient (GOPD)',
  'Internal Medicine',
  'Cardiology & Hypertension',
  'Maternal & Antenatal Care',
  'Paediatrics & Child Health',
  'Emergency & Acute Care',
  'Endocrinology & Diabetes',
  'Family Medicine',
  'Laboratory & Diagnostics',
];

export const NIGERIAN_STATES = [
  'Lagos State',
  'FCT Abuja',
  'Rivers State',
  'Oyo State',
  'Kano State',
  'Enugu State',
  'Kaduna State',
  'Ogun State',
  'Edo State',
  'Delta State',
  'Anambra State',
  'Cross River State',
  'Akwa Ibom State',
  'Kwara State',
  'Plateau State',
];

export function buildSeedDataset(ownerId: string) {
  const todayStr = getTodayDateString();
  const shortOwner = ownerId.slice(0, 8);

  const lagosFacilityId = `fac_lagos_${shortOwner}`;
  const abujaFacilityId = `fac_abuja_${shortOwner}`;
  const phFacilityId = `fac_ph_${shortOwner}`;

  const facility: Facility = {
    id: lagosFacilityId,
    ownerId,
    name: 'Lagos Lagoon Specialist Clinic',
    location: '14B Idejo Street, Victoria Island, Lagos, Nigeria',
    facilityType: 'Specialist Clinic',
    facilityCode: 'LLSC-VI',
    state: 'Lagos State',
    status: 'Active',
    departments: [
      'General Outpatient (GOPD)',
      'Cardiology & Hypertension',
      'Maternal & Antenatal Care',
      'Endocrinology & Diabetes',
    ],
    contactEmail: 'admin@lagoslagoonclinic.ng',
    contactPhone: '+234 803 200 4100',
    createdAt: '2026-01-15T08:00:00.000Z',
  };

  const abujaFacility: Facility = {
    id: abujaFacilityId,
    ownerId,
    name: 'Abuja Cedar Crest Hospital',
    location: '22 Gana Street, Maitama, FCT Abuja, Nigeria',
    facilityType: 'Hospital',
    facilityCode: 'ACCH-ABJ',
    state: 'FCT Abuja',
    status: 'Active',
    departments: [
      'Internal Medicine',
      'Emergency & Acute Care',
      'Paediatrics & Child Health',
      'Maternal & Antenatal Care',
      'General Outpatient (GOPD)',
    ],
    contactEmail: 'medicaldirector@cedarcresthospital.ng',
    contactPhone: '+234 809 440 8820',
    createdAt: '2026-02-02T09:00:00.000Z',
  };

  const phFacility: Facility = {
    id: phFacilityId,
    ownerId,
    name: 'Port Harcourt Riverside Medical Centre',
    location: '8 Evo Road, GRA Phase 2, Port Harcourt, Rivers State, Nigeria',
    facilityType: 'Medical Center',
    facilityCode: 'PRMC-PHC',
    state: 'Rivers State',
    status: 'Active',
    departments: [
      'Family Medicine',
      'General Outpatient (GOPD)',
      'Laboratory & Diagnostics',
      'Maternal & Antenatal Care',
    ],
    contactEmail: 'operations@riversidemedical.ng',
    contactPhone: '+234 805 712 3390',
    createdAt: '2026-02-18T10:15:00.000Z',
  };

  const facilities: Facility[] = [facility, abujaFacility, phFacility];

  const staffDirectory: UserProfile[] = [
    // Lagos Lagoon Specialist Clinic Team
    {
      id: `usr_clinician_${shortOwner}`,
      ownerId,
      name: 'Dr. Adaeze Okafor',
      email: 'adaeze.okafor@cornerbrief-demo.ng',
      role: 'Clinician',
      facilityId: lagosFacilityId,
      department: 'Cardiology & Hypertension',
      createdAt: '2026-01-15T08:30:00.000Z',
    },
    {
      id: `usr_admin_${shortOwner}`,
      ownerId,
      name: 'Chinedu Eze',
      email: 'chinedu.eze@cornerbrief-demo.ng',
      role: 'Admin',
      facilityId: lagosFacilityId,
      department: 'Hospital Administration',
      createdAt: '2026-01-15T08:15:00.000Z',
    },
    {
      id: `usr_staff_${shortOwner}`,
      ownerId,
      name: 'Amina Bello',
      email: 'amina.bello@cornerbrief-demo.ng',
      role: 'Staff',
      facilityId: lagosFacilityId,
      department: 'General Outpatient (GOPD)',
      createdAt: '2026-01-16T09:00:00.000Z',
    },
    // Abuja Cedar Crest Hospital Team
    {
      id: `usr_abj_clinician_${shortOwner}`,
      ownerId,
      name: 'Dr. Ibrahim Danjuma',
      email: 'ibrahim.danjuma@cedarcrest-demo.ng',
      role: 'Clinician',
      facilityId: abujaFacilityId,
      department: 'Internal Medicine',
      createdAt: '2026-02-02T09:30:00.000Z',
    },
    {
      id: `usr_abj_admin_${shortOwner}`,
      ownerId,
      name: 'Halima Abdullahi',
      email: 'halima.abdullahi@cedarcrest-demo.ng',
      role: 'Admin',
      facilityId: abujaFacilityId,
      department: 'Hospital Administration',
      createdAt: '2026-02-02T09:10:00.000Z',
    },
    {
      id: `usr_abj_staff_${shortOwner}`,
      ownerId,
      name: 'Musa Garba',
      email: 'musa.garba@cedarcrest-demo.ng',
      role: 'Staff',
      facilityId: abujaFacilityId,
      department: 'Emergency & Acute Care',
      createdAt: '2026-02-03T08:45:00.000Z',
    },
    // Port Harcourt Riverside Medical Centre Team
    {
      id: `usr_ph_clinician_${shortOwner}`,
      ownerId,
      name: 'Dr. Tamuno Briggs',
      email: 'tamuno.briggs@riverside-demo.ng',
      role: 'Clinician',
      facilityId: phFacilityId,
      department: 'Family Medicine',
      createdAt: '2026-02-18T11:00:00.000Z',
    },
    {
      id: `usr_ph_admin_${shortOwner}`,
      ownerId,
      name: 'Ebiere Amachree',
      email: 'ebiere.amachree@riverside-demo.ng',
      role: 'Admin',
      facilityId: phFacilityId,
      department: 'Hospital Administration',
      createdAt: '2026-02-18T10:30:00.000Z',
    },
    {
      id: `usr_ph_staff_${shortOwner}`,
      ownerId,
      name: 'Blessing Wike',
      email: 'blessing.wike@riverside-demo.ng',
      role: 'Staff',
      facilityId: phFacilityId,
      department: 'General Outpatient (GOPD)',
      createdAt: '2026-02-19T08:30:00.000Z',
    },
  ];

  // Lagos Patient IDs
  const p1Id = `pat_1041_${shortOwner}`;
  const p2Id = `pat_1042_${shortOwner}`;
  const p3Id = `pat_1043_${shortOwner}`;
  const p4Id = `pat_1044_${shortOwner}`;

  // Abuja Patient IDs
  const p5Id = `pat_2041_${shortOwner}`;
  const p6Id = `pat_2042_${shortOwner}`;
  const p7Id = `pat_2043_${shortOwner}`;

  // Port Harcourt Patient IDs
  const p8Id = `pat_3041_${shortOwner}`;
  const p9Id = `pat_3042_${shortOwner}`;

  const patients: Patient[] = [
    // --- LAGOS LAGOON SPECIALIST CLINIC PATIENTS ---
    {
      id: p1Id,
      ownerId,
      patientId: 'CB-NG-2026-1041',
      facilityId: lagosFacilityId,
      firstName: 'Oluwaseun',
      lastName: 'Adeyemi',
      dateOfBirth: '1978-04-12',
      sex: 'Male',
      phone: '+234 803 451 8920',
      email: 'seun.adeyemi@example.ng',
      address: '28 Admiralty Way, Lekki Phase 1, Lagos',
      emergencyContact: 'Funke Adeyemi (Spouse) — +234 802 310 4412',
      status: 'Follow-Up',
      notes: 'Long-standing essential hypertension; prefers morning clinic appointments.',
      createdAt: '2026-02-10T09:15:00.000Z',
    },
    {
      id: p2Id,
      ownerId,
      patientId: 'CB-NG-2026-1042',
      facilityId: lagosFacilityId,
      firstName: 'Zainab',
      lastName: 'Danjuma',
      dateOfBirth: '1994-09-23',
      sex: 'Female',
      phone: '+234 809 224 7105',
      email: 'zainab.danjuma@example.ng',
      address: '11 Glover Road, Ikoyi, Lagos',
      emergencyContact: 'Musa Danjuma (Husband) — +234 809 112 8830',
      status: 'Active',
      notes: 'Second trimester antenatal follow-up (G2P1).',
      createdAt: '2026-02-14T11:30:00.000Z',
    },
    {
      id: p3Id,
      ownerId,
      patientId: 'CB-NG-2026-1043',
      facilityId: lagosFacilityId,
      firstName: 'Emeka',
      lastName: 'Nwosu',
      dateOfBirth: '1989-11-05',
      sex: 'Male',
      phone: '+234 806 781 3349',
      email: 'emeka.nwosu@example.ng',
      address: '45 Bode Thomas Street, Surulere, Lagos',
      emergencyContact: 'Ngozi Nwosu (Sister) — +234 803 908 1124',
      status: 'Active',
      notes: 'Presented to outpatient clinic with acute febrile episode.',
      createdAt: '2026-03-01T10:00:00.000Z',
    },
    {
      id: p4Id,
      ownerId,
      patientId: 'CB-NG-2026-1044',
      facilityId: lagosFacilityId,
      firstName: 'Folake',
      lastName: 'Ogunleye',
      dateOfBirth: '1965-02-19',
      sex: 'Female',
      phone: '+234 805 619 2088',
      email: 'folake.ogunleye@example.ng',
      address: '9 Isaac John Street, Ikeja GRA, Lagos',
      emergencyContact: 'Tunde Ogunleye (Son) — +234 807 554 0921',
      status: 'Follow-Up',
      notes: 'Routine glycemic monitoring and diabetic foot check.',
      createdAt: '2026-03-05T14:20:00.000Z',
    },

    // --- ABUJA CEDAR CREST HOSPITAL PATIENTS ---
    {
      id: p5Id,
      ownerId,
      patientId: 'ACCH-NG-2026-2041',
      facilityId: abujaFacilityId,
      firstName: 'Abdullahi',
      lastName: 'Suleiman',
      dateOfBirth: '1972-07-18',
      sex: 'Male',
      phone: '+234 803 711 5402',
      email: 'abdullahi.suleiman@example.ng',
      address: '14 Usuma Street, Maitama, FCT Abuja',
      emergencyContact: 'Aisha Suleiman (Spouse) — +234 809 300 1184',
      status: 'Follow-Up',
      notes: 'Hypertension and dyslipidaemia follow-up under Internal Medicine.',
      createdAt: '2026-02-11T10:00:00.000Z',
    },
    {
      id: p6Id,
      ownerId,
      patientId: 'ACCH-NG-2026-2042',
      facilityId: abujaFacilityId,
      firstName: 'Chidinma',
      lastName: 'Anyanwu',
      dateOfBirth: '1999-03-14',
      sex: 'Female',
      phone: '+234 806 219 4800',
      email: 'chidinma.anyanwu@example.ng',
      address: '32 Adetokunbo Ademola Crescent, Wuse 2, FCT Abuja',
      emergencyContact: 'Kelechi Anyanwu (Brother) — +234 803 884 9102',
      status: 'Active',
      notes: 'Acute broncho-respiratory review at GOPD.',
      createdAt: '2026-02-20T09:15:00.000Z',
    },
    {
      id: p7Id,
      ownerId,
      patientId: 'ACCH-NG-2026-2043',
      facilityId: abujaFacilityId,
      firstName: 'Yusuf',
      lastName: 'Bako',
      dateOfBirth: '2018-11-30',
      sex: 'Male',
      phone: '+234 802 994 3120',
      email: 'bako.family@example.ng',
      address: '7 Gimbiya Street, Area 11, Garki, FCT Abuja',
      emergencyContact: 'Hauwa Bako (Mother) — +234 802 994 3120',
      status: 'Active',
      notes: 'Paediatric outpatient evaluation for febrile illness.',
      createdAt: '2026-03-02T11:45:00.000Z',
    },

    // --- PORT HARCOURT RIVERSIDE MEDICAL CENTRE PATIENTS ---
    {
      id: p8Id,
      ownerId,
      patientId: 'PRMC-NG-2026-3041',
      facilityId: phFacilityId,
      firstName: 'Belema',
      lastName: 'Jack',
      dateOfBirth: '1985-06-25',
      sex: 'Female',
      phone: '+234 805 441 9087',
      email: 'belema.jack@example.ng',
      address: '19 Peter Odili Road, Trans-Amadi, Port Harcourt',
      emergencyContact: 'Soboma Jack (Husband) — +234 803 612 7704',
      status: 'Follow-Up',
      notes: 'Post-natal blood pressure and haemoglobin follow-up.',
      createdAt: '2026-02-22T09:30:00.000Z',
    },
    {
      id: p9Id,
      ownerId,
      patientId: 'PRMC-NG-2026-3042',
      facilityId: phFacilityId,
      firstName: 'Dumo',
      lastName: 'Horsfall',
      dateOfBirth: '1980-12-09',
      sex: 'Male',
      phone: '+234 803 509 6618',
      email: 'dumo.horsfall@example.ng',
      address: '4 Olu Obasanjo Road, Port Harcourt, Rivers State',
      emergencyContact: 'Ibim Horsfall (Spouse) — +234 809 773 1250',
      status: 'Active',
      notes: 'Outpatient epigastric discomfort and wellness check.',
      createdAt: '2026-03-04T13:10:00.000Z',
    },
  ];

  // Encounter IDs
  const e1Id = `enc_2001_${shortOwner}`;
  const e2Id = `enc_2002_${shortOwner}`;
  const e3Id = `enc_2003_${shortOwner}`;
  const e4Id = `enc_2004_${shortOwner}`;
  const e5Id = `enc_2005_${shortOwner}`;
  const e6Id = `enc_3001_${shortOwner}`;
  const e7Id = `enc_3002_${shortOwner}`;
  const e8Id = `enc_4001_${shortOwner}`;

  const encounters: Encounter[] = [
    // --- LAGOS ENCOUNTERS ---
    {
      id: e1Id,
      ownerId,
      patientId: p1Id,
      facilityId: lagosFacilityId,
      clinicianId: `usr_clinician_${shortOwner}`,
      clinicianName: 'Dr. Adaeze Okafor',
      department: 'Cardiology & Hypertension',
      encounterDate: todayStr,
      encounterType: 'Hypertension Follow-Up',
      reasonForVisit: 'Routine blood pressure review and intermittent frontal headache for 3 days.',
      vitalSigns: {
        bloodPressureSystolic: '144',
        bloodPressureDiastolic: '88',
        pulseRate: '78',
        temperatureCelsius: '36.7',
        spo2Percent: '98',
        weightKg: '82.4',
        pcvPercent: '42',
        bloodGlucose: '5.3 mmol/L',
        recordedBy: 'Amina Bello',
        recordedAt: `${todayStr}T09:05:00.000Z`,
      },
      originalInput: {
        reasonForVisit: 'Routine blood pressure review and intermittent frontal headache for 3 days.',
        patientReportedInfo:
          'Patient reports mild throbbing frontal headache mainly in the mornings over the past 3 days. Admits to missing evening antihypertensive dose twice last week during business travel to Abuja. Denies chest pain, visual blurring, palpitations, or pedal swelling.',
        relevantHistory: 'Diagnosed with essential hypertension 4 years ago. No history of diabetes mellitus or prior stroke.',
        currentMedications: 'Amlodipine 10mg once daily; Lisinopril 10mg once daily.',
        allergies: 'No known drug allergies (NKDA).',
        investigations:
          'Clinic BP sitting: 148/92 mmHg (repeat after 10 mins rest: 144/88 mmHg). Pulse: 78 bpm regular. SpO2: 98% on room air. Urinalysis: negative for protein and glucose.',
        clinicianObservations:
          'Alert, well-hydrated middle-aged man in no acute cardiorespiratory distress. Heart sounds S1 and S2 normal, no murmurs. Chest clear bilaterally. Counselled on strict medication adherence and reduced dietary sodium.',
        additionalNotes:
          'Patient advised to maintain a 2-week home blood pressure log (morning and evening readings) and return for follow-up review in 14 days.',
      },
      aiDocumentation: {
        encounterSummary:
          'Hypertension Follow-Up visit for a patient presenting with a 3-day history of intermittent morning frontal headaches and recent missed antihypertensive doses during travel. Repeat resting clinic blood pressure was 144/88 mmHg with unremarkable systemic examination and negative urinalysis.',
        presentingConcern:
          'Routine blood pressure review and intermittent frontal headache for 3 days.',
        relevantHistory: [
          'Diagnosed with essential hypertension 4 years ago.',
          'No history of diabetes mellitus or prior stroke.',
        ],
        medications: [
          'Amlodipine 10mg once daily',
          'Lisinopril 10mg once daily (reported missing evening dose twice last week during travel)',
        ],
        allergies: ['No known drug allergies (NKDA).'],
        investigations: [
          'Clinic BP sitting: 148/92 mmHg; repeat after 10 mins rest: 144/88 mmHg',
          'Pulse: 78 bpm regular; SpO2: 98% on room air',
          'Urinalysis: negative for protein and glucose',
        ],
        clinicalNotes: [
          'Patient reports mild morning frontal headache for 3 days; denies chest pain, visual blurring, palpitations, or pedal swelling.',
          'Alert and well-hydrated; S1 and S2 heart sounds normal without murmurs; chest clear bilaterally.',
          'Counselled on strict medication adherence and dietary sodium reduction.',
        ],
        followUpItems: [
          'Maintain a 2-week home blood pressure log (morning and evening readings).',
          'Return for follow-up blood pressure review in 14 days.',
        ],
        missingInformation: [
          'Body weight / BMI measurement not provided in encounter input.',
          'Recent serum electrolytes, urea, and creatinine (E/U/Cr) panel not provided.',
        ],
        requiresReview: true,
      },
      reviewedDocumentation: {
        encounterSummary:
          'Hypertension Follow-Up visit for a patient presenting with a 3-day history of intermittent morning frontal headaches and recent missed antihypertensive doses during travel. Repeat resting clinic blood pressure was 144/88 mmHg with unremarkable systemic examination and negative urinalysis.',
        presentingConcern:
          'Routine blood pressure review and intermittent frontal headache for 3 days.',
        relevantHistory: [
          'Diagnosed with essential hypertension 4 years ago.',
          'No history of diabetes mellitus or prior stroke.',
        ],
        medications: [
          'Amlodipine 10mg once daily',
          'Lisinopril 10mg once daily (missed two doses last week during travel)',
        ],
        allergies: ['No known drug allergies (NKDA).'],
        investigations: [
          'Sitting BP: 148/92 mmHg (initial), 144/88 mmHg (repeat after 10 mins rest)',
          'Pulse: 78 bpm regular; SpO2: 98% on room air',
          'Point-of-care urinalysis: negative for protein and glucose',
        ],
        clinicalNotes: [
          'Patient reports mild morning frontal headache for 3 days; denies chest pain, visual changes, palpitations, or pedal oedema.',
          'Cardiovascular and respiratory examination unremarkable (S1/S2 normal, chest clear).',
          'Reinforced daily adherence and low-salt dietary modifications.',
        ],
        followUpItems: [
          'Keep twice-daily home blood pressure log for 14 days.',
          'Return for clinic review in 2 weeks.',
        ],
        missingInformation: [
          'Weight/BMI not recorded at intake.',
          'Recent renal function test (E/U/Cr) not provided.',
        ],
        requiresReview: false,
      },
      reviewedBy: 'Dr. Adaeze Okafor',
      reviewedAt: `${todayStr}T09:40:00.000Z`,
      addenda: [
        {
          id: `add_1001_${shortOwner}`,
          authorId: `usr_clinician_${shortOwner}`,
          authorName: 'Dr. Adaeze Okafor',
          authorRole: 'Clinician',
          note: 'Laboratory addendum: Same-day serum electrolytes, urea, and creatinine (E/U/Cr) returned within normal reference range (Creatinine 84 µmol/L, K+ 4.2 mmol/L, Na+ 139 mmol/L). Patient notified by telephone to continue current Amlodipine 10mg + Lisinopril 10mg regimen.',
          createdAt: `${todayStr}T11:15:00.000Z`,
        },
      ],
      status: 'Finalized',
      createdAt: `${todayStr}T09:10:00.000Z`,
      updatedAt: `${todayStr}T09:40:00.000Z`,
    },
    {
      id: e2Id,
      ownerId,
      patientId: p3Id,
      facilityId: lagosFacilityId,
      clinicianId: `usr_clinician_${shortOwner}`,
      clinicianName: 'Dr. Adaeze Okafor',
      department: 'General Outpatient (GOPD)',
      encounterDate: todayStr,
      encounterType: 'Acute Outpatient Consultation',
      reasonForVisit: 'High-grade fever, chills, and generalized body aches for 2 days.',
      vitalSigns: {
        bloodPressureSystolic: '118',
        bloodPressureDiastolic: '76',
        pulseRate: '96',
        temperatureCelsius: '38.4',
        spo2Percent: '98',
        weightKg: '64.0',
        pcvPercent: '39',
        bloodGlucose: '4.9 mmol/L',
        recordedBy: 'Amina Bello',
        recordedAt: `${todayStr}T10:08:00.000Z`,
      },
      originalInput: {
        reasonForVisit: 'High-grade fever, chills, and generalized body aches for 2 days.',
        patientReportedInfo:
          'Patient noticed intermittent fever worse in the evenings starting 48 hours ago, associated with headache, joint aches, and reduced appetite. Took paracetamol 1g at home with temporary relief. Denies cough, sore throat, vomiting, diarrhoea, or dysuria.',
        relevantHistory: 'Treated for uncomplicated malaria 9 months ago. No chronic medical conditions reported.',
        currentMedications: 'Paracetamol 1000mg taken prior to clinic arrival.',
        allergies: '',
        investigations:
          'Temperature: 38.4°C. Pulse: 96 bpm. BP: 118/76 mmHg. Malaria Rapid Diagnostic Test (mRDT): Positive for Plasmodium falciparum. Blood film for malaria parasites: + (trophozoites seen). PCV: 39%.',
        clinicianObservations:
          'Febrile to touch, mildly pale conjunctivae absent, anicteric sclerae, hydration adequate. Abdomen soft, non-tender, no hepatosplenomegaly. Chest clear.',
        additionalNotes:
          'Advised oral fluid hydration, tepid sponging if fever spikes, and immediate return to clinic if persistent vomiting, lethargy, or dark urine develops. Follow-up review scheduled in 3 days.',
      },
      aiDocumentation: {
        encounterSummary:
          'Acute Outpatient Consultation for a patient presenting with a 2-day history of high-grade evening fever, chills, headache, and generalized body aches. Temperature was 38.4°C and laboratory testing confirmed Plasmodium falciparum on both mRDT and blood film with a PCV of 39%.',
        presentingConcern:
          'High-grade fever, chills, and generalized body aches for 2 days.',
        relevantHistory: [
          'Treated for uncomplicated malaria 9 months ago.',
          'No chronic medical conditions reported.',
        ],
        medications: ['Paracetamol 1000mg taken prior to clinic arrival.'],
        allergies: ['Not provided.'],
        investigations: [
          'Temperature: 38.4°C; Pulse: 96 bpm; BP: 118/76 mmHg',
          'Malaria Rapid Diagnostic Test (mRDT): Positive for Plasmodium falciparum',
          'Blood film for malaria parasites: + (trophozoites seen)',
          'Packed Cell Volume (PCV): 39%',
        ],
        clinicalNotes: [
          'Patient reports 48-hour history of intermittent fever, headache, joint aches, and reduced appetite; denies cough, vomiting, diarrhoea, or dysuria.',
          'Febrile on exam (38.4°C), anicteric sclerae, adequate hydration, abdomen soft without hepatosplenomegaly, chest clear.',
          'Advised oral hydration, tepid sponging, and red-flag warning signs.',
        ],
        followUpItems: [
          'Return immediately if persistent vomiting, lethargy, or dark urine occurs.',
          'Scheduled outpatient follow-up review in 3 days.',
        ],
        missingInformation: [
          'Drug or food allergy status was not recorded in the encounter input.',
          'Body weight (kg) not recorded.',
        ],
        requiresReview: true,
      },
      reviewedDocumentation: null,
      status: 'Pending Review',
      createdAt: `${todayStr}T10:15:00.000Z`,
      updatedAt: `${todayStr}T10:20:00.000Z`,
    },
    {
      id: e3Id,
      ownerId,
      patientId: p2Id,
      facilityId: lagosFacilityId,
      clinicianId: `usr_clinician_${shortOwner}`,
      clinicianName: 'Dr. Adaeze Okafor',
      department: 'Maternal & Antenatal Care',
      encounterDate: todayStr,
      encounterType: 'Routine Antenatal Care (ANC)',
      reasonForVisit: '24-week routine antenatal check-up and fetal movement review.',
      vitalSigns: {
        bloodPressureSystolic: '110',
        bloodPressureDiastolic: '70',
        pulseRate: '80',
        temperatureCelsius: '36.6',
        spo2Percent: '99',
        weightKg: '68.5',
        pcvPercent: '34',
        bloodGlucose: '4.6 mmol/L',
        recordedBy: 'Amina Bello',
        recordedAt: `${todayStr}T10:55:00.000Z`,
      },
      originalInput: {
        reasonForVisit: '24-week routine antenatal check-up and fetal movement review.',
        patientReportedInfo:
          'Patient reports active fetal movements daily. Mild lower back ache after prolonged standing at work. Denies vaginal bleeding, fluid leakage, headache, epigastric pain, or visual disturbances.',
        relevantHistory: 'G2P1 (previous term spontaneous vaginal delivery in 2023 without complications).',
        currentMedications: 'Routine antenatal haematinics: Ferrous sulphate, Folic acid, and Calcium carbonate daily.',
        allergies: 'No known drug allergies.',
        investigations:
          'BP: 110/70 mmHg. Maternal weight: 68.5 kg. Urine dipstick: protein negative, glucose negative. PCV: 34%. Symphysio-fundal height: 24 cm. Fetal heart rate: 146 bpm regular via handheld Doppler.',
        clinicianObservations:
          'Clinically stable gravid female at 24 weeks gestation. No pedal oedema. Fundal height corresponds to gestational age.',
        additionalNotes:
          'Reviewed posture ergonomics for back comfort. Next antenatal appointment scheduled in 4 weeks.',
      },
      aiDocumentation: null,
      reviewedDocumentation: null,
      status: 'Draft',
      createdAt: `${todayStr}T11:05:00.000Z`,
      updatedAt: `${todayStr}T11:05:00.000Z`,
    },
    {
      id: e4Id,
      ownerId,
      patientId: p4Id,
      facilityId: lagosFacilityId,
      clinicianId: `usr_clinician_${shortOwner}`,
      clinicianName: 'Dr. Adaeze Okafor',
      department: 'Endocrinology & Diabetes',
      encounterDate: '2026-03-18',
      encounterType: 'Endocrinology / Diabetes Review',
      reasonForVisit: 'Quarterly Type 2 Diabetes Mellitus review and fasting blood glucose check.',
      vitalSigns: {
        bloodPressureSystolic: '126',
        bloodPressureDiastolic: '78',
        pulseRate: '74',
        temperatureCelsius: '36.5',
        spo2Percent: '99',
        weightKg: '76.2',
        pcvPercent: '41',
        bloodGlucose: '6.4 mmol/L (FBG)',
        recordedBy: 'Amina Bello',
        recordedAt: '2026-03-18T14:20:00.000Z',
      },
      originalInput: {
        reasonForVisit: 'Quarterly Type 2 Diabetes Mellitus review and fasting blood glucose check.',
        patientReportedInfo:
          'Patient reports good energy levels and adherence to prescribed diet. Occasional mild tingling in both soles at night. Denies polyuria, polydipsia, hypoglycaemic episodes, or foot ulcers.',
        relevantHistory: 'Type 2 Diabetes Mellitus diagnosed 6 years ago.',
        currentMedications: 'Metformin 1000mg twice daily with meals.',
        allergies: 'Sulphonamides (causes skin rash).',
        investigations:
          'Fasting Blood Glucose (FBG): 116 mg/dL (6.4 mmol/L). HbA1c: 6.8%. BP: 126/78 mmHg. Foot exam: intact skin bilaterally, dorsalis pedis pulses palpable, monofilament sensation preserved.',
        clinicianObservations:
          'Well-controlled glycaemic profile. No active diabetic foot lesions identified.',
        additionalNotes:
          'Continue current dietary regimen and daily foot inspection. Repeat HbA1c in 3 months.',
      },
      aiDocumentation: {
        encounterSummary:
          'Quarterly Endocrinology / Diabetes Review for a patient with a 6-year history of Type 2 Diabetes Mellitus. Fasting blood glucose was 116 mg/dL (6.4 mmol/L) and HbA1c was 6.8%, with intact bilateral foot examination.',
        presentingConcern:
          'Quarterly Type 2 Diabetes Mellitus review and fasting blood glucose check.',
        relevantHistory: ['Type 2 Diabetes Mellitus diagnosed 6 years ago.'],
        medications: ['Metformin 1000mg twice daily with meals.'],
        allergies: ['Sulphonamides (causes skin rash).'],
        investigations: [
          'Fasting Blood Glucose (FBG): 116 mg/dL (6.4 mmol/L)',
          'HbA1c: 6.8%',
          'BP: 126/78 mmHg',
          'Foot exam: intact skin bilaterally, dorsalis pedis pulses palpable, monofilament sensation preserved',
        ],
        clinicalNotes: [
          'Reports good energy and dietary adherence; notes occasional mild nocturnal plantar tingling; denies hypoglycaemia or foot ulcers.',
          'Glycaemic control stable; no diabetic foot lesions.',
        ],
        followUpItems: [
          'Continue dietary regimen and daily home foot inspection.',
          'Repeat HbA1c in 3 months.',
        ],
        missingInformation: ['Lipid profile and urine microalbuminuria results not provided.'],
        requiresReview: true,
      },
      reviewedDocumentation: {
        encounterSummary:
          'Quarterly Endocrinology / Diabetes Review for a patient with a 6-year history of Type 2 Diabetes Mellitus. Fasting blood glucose was 116 mg/dL (6.4 mmol/L) and HbA1c was 6.8%, with intact bilateral foot examination.',
        presentingConcern:
          'Quarterly Type 2 Diabetes Mellitus review and fasting blood glucose check.',
        relevantHistory: ['Type 2 Diabetes Mellitus diagnosed 6 years ago.'],
        medications: ['Metformin 1000mg twice daily with meals.'],
        allergies: ['Sulphonamides (skin rash).'],
        investigations: [
          'Fasting Blood Glucose (FBG): 116 mg/dL (6.4 mmol/L)',
          'HbA1c: 6.8%',
          'BP: 126/78 mmHg',
          'Foot examination: intact skin, palpable dorsalis pedis pulses, preserved monofilament sensation',
        ],
        clinicalNotes: [
          'Patient reports good dietary adherence and occasional mild nocturnal plantar tingling.',
          'Well-controlled glycaemic profile without foot ulceration.',
        ],
        followUpItems: [
          'Continue daily home foot inspection.',
          'Schedule repeat HbA1c and fasting lipid panel in 3 months.',
        ],
        missingInformation: ['Annual fasting lipid profile and urine ACR not provided.'],
        requiresReview: false,
      },
      reviewedBy: 'Dr. Adaeze Okafor',
      reviewedAt: '2026-03-18T15:10:00.000Z',
      status: 'Finalized',
      createdAt: '2026-03-18T14:30:00.000Z',
      updatedAt: '2026-03-18T15:10:00.000Z',
    },
    {
      id: e5Id,
      ownerId,
      patientId: p1Id,
      facilityId: lagosFacilityId,
      clinicianId: `usr_clinician_${shortOwner}`,
      clinicianName: 'Dr. Adaeze Okafor',
      department: 'Cardiology & Hypertension',
      encounterDate: '2026-02-10',
      encounterType: 'Initial Cardiology Consultation',
      reasonForVisit: 'Initial clinic registration and baseline cardiovascular assessment.',
      vitalSigns: {
        bloodPressureSystolic: '136',
        bloodPressureDiastolic: '84',
        pulseRate: '74',
        temperatureCelsius: '36.6',
        spo2Percent: '99',
        weightKg: '83.0',
        pcvPercent: '43',
        bloodGlucose: '5.1 mmol/L',
        recordedBy: 'Amina Bello',
        recordedAt: '2026-02-10T09:20:00.000Z',
      },
      originalInput: {
        reasonForVisit: 'Initial clinic registration and baseline cardiovascular assessment.',
        patientReportedInfo:
          'Transferred care after relocating office to Victoria Island. Asymptomatic at baseline.',
        relevantHistory: 'Essential hypertension for 4 years.',
        currentMedications: 'Amlodipine 10mg OD; Lisinopril 10mg OD.',
        allergies: 'No known drug allergies.',
        investigations:
          'BP: 136/84 mmHg. Pulse: 74 bpm. Resting 12-lead ECG: Normal sinus rhythm, no acute ischaemic changes.',
        clinicianObservations: 'Cardiovascularly stable.',
        additionalNotes: 'Scheduled routine follow-up in 4-6 weeks.',
      },
      aiDocumentation: {
        encounterSummary:
          'Initial Cardiology Consultation for baseline cardiovascular assessment after transferring care. Blood pressure was 136/84 mmHg and resting 12-lead ECG showed normal sinus rhythm.',
        presentingConcern:
          'Initial clinic registration and baseline cardiovascular assessment.',
        relevantHistory: ['Essential hypertension for 4 years.'],
        medications: ['Amlodipine 10mg OD', 'Lisinopril 10mg OD'],
        allergies: ['No known drug allergies.'],
        investigations: [
          'BP: 136/84 mmHg; Pulse: 74 bpm',
          'Resting 12-lead ECG: Normal sinus rhythm, no acute ischaemic changes',
        ],
        clinicalNotes: ['Asymptomatic at baseline; cardiovascularly stable on examination.'],
        followUpItems: ['Routine blood pressure follow-up in 4-6 weeks.'],
        missingInformation: ['Baseline fasting lipid panel not provided.'],
        requiresReview: false,
      },
      reviewedDocumentation: {
        encounterSummary:
          'Initial Cardiology Consultation for baseline cardiovascular assessment after transferring care. Blood pressure was 136/84 mmHg and resting 12-lead ECG showed normal sinus rhythm.',
        presentingConcern:
          'Initial clinic registration and baseline cardiovascular assessment.',
        relevantHistory: ['Essential hypertension for 4 years.'],
        medications: ['Amlodipine 10mg OD', 'Lisinopril 10mg OD'],
        allergies: ['No known drug allergies.'],
        investigations: [
          'BP: 136/84 mmHg; Pulse: 74 bpm',
          'Resting 12-lead ECG: Normal sinus rhythm, no acute ischaemic changes',
        ],
        clinicalNotes: ['Asymptomatic at baseline; cardiovascularly stable on examination.'],
        followUpItems: ['Routine blood pressure follow-up in 4-6 weeks.'],
        missingInformation: ['Baseline fasting lipid panel not provided.'],
        requiresReview: false,
      },
      reviewedBy: 'Dr. Adaeze Okafor',
      reviewedAt: '2026-02-10T10:15:00.000Z',
      status: 'Finalized',
      createdAt: '2026-02-10T09:30:00.000Z',
      updatedAt: '2026-02-10T10:15:00.000Z',
    },

    // --- ABUJA CEDAR CREST HOSPITAL ENCOUNTERS ---
    {
      id: e6Id,
      ownerId,
      patientId: p5Id,
      facilityId: abujaFacilityId,
      clinicianId: `usr_abj_clinician_${shortOwner}`,
      clinicianName: 'Dr. Ibrahim Danjuma',
      department: 'Internal Medicine',
      encounterDate: todayStr,
      encounterType: 'Internal Medicine Follow-Up',
      reasonForVisit: 'Blood pressure & fasting lipid panel review.',
      vitalSigns: {
        bloodPressureSystolic: '132',
        bloodPressureDiastolic: '82',
        pulseRate: '72',
        temperatureCelsius: '36.6',
        spo2Percent: '98',
        weightKg: '79.5',
        pcvPercent: '42',
        bloodGlucose: '5.1 mmol/L (FBG)',
        recordedBy: 'Musa Garba',
        recordedAt: `${todayStr}T09:42:00.000Z`,
      },
      originalInput: {
        reasonForVisit: 'Blood pressure & fasting lipid panel review.',
        patientReportedInfo:
          'Patient reports good compliance with daily medication and evening brisk walking 4 times weekly. Denies dizziness, chest tightness, or dyspnoea on exertion.',
        relevantHistory: 'Essential hypertension (5 years) and mild dyslipidaemia.',
        currentMedications: 'Telmisartan 40mg once daily; Rosuvastatin 10mg nocte.',
        allergies: 'No known drug allergies.',
        investigations:
          'Sitting BP: 132/82 mmHg. Pulse: 72 bpm. Fasting Total Cholesterol: 4.6 mmol/L; LDL: 2.5 mmol/L; HDL: 1.3 mmol/L; FBG: 5.1 mmol/L.',
        clinicianObservations:
          'Well-controlled blood pressure and improved lipid profile. Cardiovascular and respiratory examination normal.',
        additionalNotes:
          'Continue current lifestyle measures and return for 3-month Internal Medicine review.',
      },
      aiDocumentation: {
        encounterSummary:
          'Internal Medicine Follow-Up for blood pressure and fasting lipid panel review. Sitting blood pressure was 132/82 mmHg and fasting lipid panel showed Total Cholesterol 4.6 mmol/L and LDL 2.5 mmol/L.',
        presentingConcern: 'Blood pressure & fasting lipid panel review.',
        relevantHistory: ['Essential hypertension (5 years) and mild dyslipidaemia.'],
        medications: ['Telmisartan 40mg once daily', 'Rosuvastatin 10mg nocte'],
        allergies: ['No known drug allergies.'],
        investigations: [
          'Sitting BP: 132/82 mmHg; Pulse: 72 bpm',
          'Fasting Total Cholesterol: 4.6 mmol/L; LDL: 2.5 mmol/L; HDL: 1.3 mmol/L',
          'Fasting Blood Glucose: 5.1 mmol/L',
        ],
        clinicalNotes: [
          'Good adherence to medication and brisk walking 4 times weekly; denies chest tightness or dyspnoea.',
          'Cardiovascular and respiratory exam normal.',
        ],
        followUpItems: [
          'Continue current lifestyle measures.',
          'Return for 3-month Internal Medicine review.',
        ],
        missingInformation: ['Body weight / BMI not recorded.'],
        requiresReview: false,
      },
      reviewedDocumentation: {
        encounterSummary:
          'Internal Medicine Follow-Up for blood pressure and fasting lipid panel review. Sitting blood pressure was 132/82 mmHg and fasting lipid panel showed Total Cholesterol 4.6 mmol/L and LDL 2.5 mmol/L.',
        presentingConcern: 'Blood pressure & fasting lipid panel review.',
        relevantHistory: ['Essential hypertension (5 years) and mild dyslipidaemia.'],
        medications: ['Telmisartan 40mg once daily', 'Rosuvastatin 10mg nocte'],
        allergies: ['No known drug allergies.'],
        investigations: [
          'Sitting BP: 132/82 mmHg; Pulse: 72 bpm',
          'Fasting Total Cholesterol: 4.6 mmol/L; LDL: 2.5 mmol/L; HDL: 1.3 mmol/L',
          'Fasting Blood Glucose: 5.1 mmol/L',
        ],
        clinicalNotes: [
          'Good adherence to medication and brisk walking 4 times weekly; denies chest tightness or dyspnoea.',
          'Cardiovascular and respiratory exam normal.',
        ],
        followUpItems: [
          'Continue current lifestyle measures.',
          'Return for 3-month Internal Medicine review.',
        ],
        missingInformation: ['Body weight / BMI not recorded.'],
        requiresReview: false,
      },
      reviewedBy: 'Dr. Ibrahim Danjuma',
      reviewedAt: `${todayStr}T10:30:00.000Z`,
      status: 'Finalized',
      createdAt: `${todayStr}T09:50:00.000Z`,
      updatedAt: `${todayStr}T10:30:00.000Z`,
    },
    {
      id: e7Id,
      ownerId,
      patientId: p6Id,
      facilityId: abujaFacilityId,
      clinicianId: `usr_abj_clinician_${shortOwner}`,
      clinicianName: 'Dr. Ibrahim Danjuma',
      department: 'General Outpatient (GOPD)',
      encounterDate: todayStr,
      encounterType: 'Acute Outpatient Consultation',
      reasonForVisit: 'Dry cough and mild sore throat for 4 days following dusty Harmattan exposure.',
      vitalSigns: {
        bloodPressureSystolic: '114',
        bloodPressureDiastolic: '72',
        pulseRate: '76',
        temperatureCelsius: '36.8',
        spo2Percent: '99',
        weightKg: '67.0',
        pcvPercent: '40',
        bloodGlucose: '4.8 mmol/L',
        recordedBy: 'Musa Garba',
        recordedAt: `${todayStr}T11:12:00.000Z`,
      },
      originalInput: {
        reasonForVisit: 'Dry cough and mild sore throat for 4 days following dusty Harmattan exposure.',
        patientReportedInfo:
          'Patient reports non-productive cough and throat irritation for 4 days. No fever, no haemoptysis, no shortness of breath, no chest pain.',
        relevantHistory: 'Mild seasonal allergic rhinitis. No history of asthma.',
        currentMedications: 'Warm saline gargles and vitamin C lozenges.',
        allergies: 'Penicillin (mild urticarial rash in childhood).',
        investigations:
          'Temp: 36.8°C. SpO2: 99% on room air. Respiratory rate: 16 cpm. BP: 114/72 mmHg.',
        clinicianObservations:
          'Mildly hyperaemic posterior pharyngeal wall without tonsillar exudates. Chest auscultation clear with vesicular breath sounds bilaterally.',
        additionalNotes:
          'Advised increased oral warm fluids, dust mask use outdoors, and return if fever or breathlessness develops.',
      },
      aiDocumentation: {
        encounterSummary:
          'Acute Outpatient Consultation for a 4-day history of dry cough and mild sore throat following dusty exposure. Vital signs were normal (Temp 36.8°C, SpO2 99%) with clear chest auscultation and mild pharyngeal hyperaemia without exudates.',
        presentingConcern:
          'Dry cough and mild sore throat for 4 days following dusty Harmattan exposure.',
        relevantHistory: ['Mild seasonal allergic rhinitis.', 'No history of asthma.'],
        medications: ['Warm saline gargles and vitamin C lozenges.'],
        allergies: ['Penicillin (mild urticarial rash in childhood).'],
        investigations: [
          'Temp: 36.8°C; SpO2: 99% on room air',
          'Respiratory rate: 16 cpm; BP: 114/72 mmHg',
        ],
        clinicalNotes: [
          'Non-productive cough and throat irritation for 4 days; denies fever, haemoptysis, or dyspnoea.',
          'Mildly hyperaemic posterior pharynx without exudates; chest clear bilaterally.',
        ],
        followUpItems: [
          'Maintain oral warm fluids and dust protection.',
          'Return to clinic if fever or shortness of breath develops.',
        ],
        missingInformation: ['All core clinical encounter fields were supplied.'],
        requiresReview: true,
      },
      reviewedDocumentation: null,
      status: 'Pending Review',
      createdAt: `${todayStr}T11:20:00.000Z`,
      updatedAt: `${todayStr}T11:25:00.000Z`,
    },

    // --- PORT HARCOURT RIVERSIDE MEDICAL CENTRE ENCOUNTERS ---
    {
      id: e8Id,
      ownerId,
      patientId: p8Id,
      facilityId: phFacilityId,
      clinicianId: `usr_ph_clinician_${shortOwner}`,
      clinicianName: 'Dr. Tamuno Briggs',
      department: 'Maternal & Antenatal Care',
      encounterDate: todayStr,
      encounterType: 'Post-Natal Follow-Up',
      reasonForVisit: '6-week post-natal maternal wellness and blood pressure check.',
      vitalSigns: {
        bloodPressureSystolic: '118',
        bloodPressureDiastolic: '76',
        pulseRate: '74',
        temperatureCelsius: '36.6',
        spo2Percent: '99',
        weightKg: '65.8',
        pcvPercent: '36',
        bloodGlucose: '4.7 mmol/L',
        recordedBy: 'Blessing Wike',
        recordedAt: `${todayStr}T10:10:00.000Z`,
      },
      originalInput: {
        reasonForVisit: '6-week post-natal maternal wellness and blood pressure check.',
        patientReportedInfo:
          'Patient delivered a healthy term infant 6 weeks ago. Breastfeeding exclusively and sleeping well. Denies headache, calf pain, or abnormal lochia.',
        relevantHistory: 'Mild gestational hypertension during third trimester, resolved post-partum.',
        currentMedications: 'Post-natal multivitamin and ferrous fumarate daily.',
        allergies: 'No known drug allergies.',
        investigations:
          'Sitting BP: 118/76 mmHg. Pulse: 74 bpm. PCV: 36%. Urine dipstick: negative for protein.',
        clinicianObservations:
          'Normotensive, well-rested mother. Uterus well involuted. Discussed family planning options and infant immunization schedule.',
        additionalNotes:
          'Discharged from post-natal high-BP surveillance; routine wellness review in 6 months.',
      },
      aiDocumentation: {
        encounterSummary:
          '6-week Post-Natal Follow-Up for maternal wellness and blood pressure surveillance following resolved third-trimester gestational hypertension. Sitting BP was 118/76 mmHg, PCV 36%, and urine protein negative.',
        presentingConcern: '6-week post-natal maternal wellness and blood pressure check.',
        relevantHistory: [
          'Mild gestational hypertension during third trimester, resolved post-partum.',
        ],
        medications: ['Post-natal multivitamin and ferrous fumarate daily.'],
        allergies: ['No known drug allergies.'],
        investigations: [
          'Sitting BP: 118/76 mmHg; Pulse: 74 bpm',
          'PCV: 36%; Urine dipstick: negative for protein',
        ],
        clinicalNotes: [
          'Exclusive breastfeeding; denies headache, calf pain, or abnormal lochia.',
          'Normotensive, uterus well involuted; counselled on family planning and infant immunizations.',
        ],
        followUpItems: [
          'Discharged from post-natal high-BP surveillance.',
          'Routine wellness review in 6 months.',
        ],
        missingInformation: ['Maternal weight not recorded.'],
        requiresReview: false,
      },
      reviewedDocumentation: {
        encounterSummary:
          '6-week Post-Natal Follow-Up for maternal wellness and blood pressure surveillance following resolved third-trimester gestational hypertension. Sitting BP was 118/76 mmHg, PCV 36%, and urine protein negative.',
        presentingConcern: '6-week post-natal maternal wellness and blood pressure check.',
        relevantHistory: [
          'Mild gestational hypertension during third trimester, resolved post-partum.',
        ],
        medications: ['Post-natal multivitamin and ferrous fumarate daily.'],
        allergies: ['No known drug allergies.'],
        investigations: [
          'Sitting BP: 118/76 mmHg; Pulse: 74 bpm',
          'PCV: 36%; Urine dipstick: negative for protein',
        ],
        clinicalNotes: [
          'Exclusive breastfeeding; denies headache, calf pain, or abnormal lochia.',
          'Normotensive, uterus well involuted; counselled on family planning and infant immunizations.',
        ],
        followUpItems: [
          'Discharged from post-natal high-BP surveillance.',
          'Routine wellness review in 6 months.',
        ],
        missingInformation: ['Maternal weight not recorded.'],
        requiresReview: false,
      },
      reviewedBy: 'Dr. Tamuno Briggs',
      reviewedAt: `${todayStr}T10:50:00.000Z`,
      status: 'Finalized',
      createdAt: `${todayStr}T10:20:00.000Z`,
      updatedAt: `${todayStr}T10:50:00.000Z`,
    },
  ];

  const auditLogs: AuditLog[] = [
    {
      id: `aud_3001_${shortOwner}`,
      ownerId,
      userId: `usr_admin_${shortOwner}`,
      userName: 'Chinedu Eze',
      userRole: 'Admin',
      facilityId: lagosFacilityId,
      action: 'Configured Lagos Lagoon Specialist Clinic tenant workspace on CornerBrief',
      patientId: '',
      encounterId: '',
      timestamp: '2026-01-15T08:20:00.000Z',
    },
    {
      id: `aud_3002_${shortOwner}`,
      ownerId,
      userId: `usr_staff_${shortOwner}`,
      userName: 'Amina Bello',
      userRole: 'Staff',
      facilityId: lagosFacilityId,
      action: 'Registered patient record CB-NG-2026-1041 (Oluwaseun Adeyemi)',
      patientId: p1Id,
      encounterId: '',
      timestamp: '2026-02-10T09:15:00.000Z',
    },
    {
      id: `aud_3003_${shortOwner}`,
      ownerId,
      userId: `usr_clinician_${shortOwner}`,
      userName: 'Dr. Adaeze Okafor',
      userRole: 'Clinician',
      facilityId: lagosFacilityId,
      action: 'Generated NONYE AI structured documentation for Hypertension Follow-Up',
      patientId: p1Id,
      encounterId: e1Id,
      timestamp: `${todayStr}T09:25:00.000Z`,
    },
    {
      id: `aud_3004_${shortOwner}`,
      ownerId,
      userId: `usr_clinician_${shortOwner}`,
      userName: 'Dr. Adaeze Okafor',
      userRole: 'Clinician',
      facilityId: lagosFacilityId,
      action: 'Reviewed, attested, and finalized clinical documentation',
      patientId: p1Id,
      encounterId: e1Id,
      timestamp: `${todayStr}T09:40:00.000Z`,
    },
    {
      id: `aud_3005_${shortOwner}`,
      ownerId,
      userId: `usr_clinician_${shortOwner}`,
      userName: 'Dr. Adaeze Okafor',
      userRole: 'Clinician',
      facilityId: lagosFacilityId,
      action: 'Generated NONYE AI structured documentation (Awaiting Clinician Review)',
      patientId: p3Id,
      encounterId: e2Id,
      timestamp: `${todayStr}T10:20:00.000Z`,
    },
    {
      id: `aud_3006_${shortOwner}`,
      ownerId,
      userId: `usr_abj_admin_${shortOwner}`,
      userName: 'Halima Abdullahi',
      userRole: 'Admin',
      facilityId: abujaFacilityId,
      action: 'Onboarded Abuja Cedar Crest Hospital workspace and configured 5 departments',
      patientId: '',
      encounterId: '',
      timestamp: '2026-02-02T09:15:00.000Z',
    },
    {
      id: `aud_3007_${shortOwner}`,
      ownerId,
      userId: `usr_abj_clinician_${shortOwner}`,
      userName: 'Dr. Ibrahim Danjuma',
      userRole: 'Clinician',
      facilityId: abujaFacilityId,
      action: 'Reviewed and finalized Internal Medicine documentation for ACCH-NG-2026-2041',
      patientId: p5Id,
      encounterId: e6Id,
      timestamp: `${todayStr}T10:30:00.000Z`,
    },
    {
      id: `aud_3008_${shortOwner}`,
      ownerId,
      userId: `usr_ph_clinician_${shortOwner}`,
      userName: 'Dr. Tamuno Briggs',
      userRole: 'Clinician',
      facilityId: phFacilityId,
      action: 'Reviewed and finalized Post-Natal documentation for PRMC-NG-2026-3041',
      patientId: p8Id,
      encounterId: e8Id,
      timestamp: `${todayStr}T10:50:00.000Z`,
    },
  ];

  // Stage 2B Multi-Facility Memberships Seed Data
  const facilityMemberships: FacilityMembership[] = [
    // Dr. Adaeze Okafor - Belongs to TWO facilities with DIFFERENT roles
    {
      membershipId: generateMembershipId(lagosFacilityId, 'adaeze.okafor'),
      userId: `usr_clinician_${shortOwner}`,
      facilityId: lagosFacilityId,
      facilityCode: 'LLSC-VI',
      username: 'adaeze.okafor',
      normalizedUsername: 'adaeze.okafor',
      role: 'Doctor',
      departmentId: 'Cardiology & Hypertension',
      status: 'Active',
      permissions: DEFAULT_ROLE_PERMISSIONS.Doctor,
      createdAt: '2026-01-15T08:30:00.000Z',
      updatedAt: '2026-01-15T08:30:00.000Z',
      createdBy: 'system_bootstrap',
      displayName: 'Dr. Adaeze Okafor',
      email: 'adaeze.okafor@cornerbrief-demo.ng',
    },
    {
      membershipId: generateMembershipId(abujaFacilityId, 'adaeze.okafor'),
      userId: `usr_clinician_${shortOwner}`,
      facilityId: abujaFacilityId,
      facilityCode: 'ACCH-ABJ',
      username: 'adaeze.okafor',
      normalizedUsername: 'adaeze.okafor',
      role: 'FacilityAdmin', // Different role across hospitals
      departmentId: 'Internal Medicine',
      status: 'Active',
      permissions: DEFAULT_ROLE_PERMISSIONS.FacilityAdmin,
      createdAt: '2026-02-02T10:00:00.000Z',
      updatedAt: '2026-02-02T10:00:00.000Z',
      createdBy: 'system_bootstrap',
      displayName: 'Dr. Adaeze Okafor (CMD / Facility Admin)',
      email: 'adaeze.okafor@cornerbrief-demo.ng',
    },
    // Lagos Lagoon Team
    {
      membershipId: generateMembershipId(lagosFacilityId, 'chinedu.eze'),
      userId: `usr_admin_${shortOwner}`,
      facilityId: lagosFacilityId,
      facilityCode: 'LLSC-VI',
      username: 'chinedu.eze',
      normalizedUsername: 'chinedu.eze',
      role: 'FacilityAdmin',
      departmentId: 'Hospital Administration',
      status: 'Active',
      permissions: DEFAULT_ROLE_PERMISSIONS.FacilityAdmin,
      createdAt: '2026-01-15T08:15:00.000Z',
      updatedAt: '2026-01-15T08:15:00.000Z',
      createdBy: 'system_bootstrap',
      displayName: 'Chinedu Eze',
      email: 'chinedu.eze@cornerbrief-demo.ng',
    },
    {
      membershipId: generateMembershipId(lagosFacilityId, 'amina.bello'),
      userId: `usr_staff_${shortOwner}`,
      facilityId: lagosFacilityId,
      facilityCode: 'LLSC-VI',
      username: 'amina.bello',
      normalizedUsername: 'amina.bello',
      role: 'Nurse',
      departmentId: 'General Outpatient (GOPD)',
      status: 'Active',
      permissions: DEFAULT_ROLE_PERMISSIONS.Nurse,
      createdAt: '2026-01-16T09:00:00.000Z',
      updatedAt: '2026-01-16T09:00:00.000Z',
      createdBy: 'system_bootstrap',
      displayName: 'Amina Bello',
      email: 'amina.bello@cornerbrief-demo.ng',
    },
    // Abuja Cedar Crest Team
    {
      membershipId: generateMembershipId(abujaFacilityId, 'ibrahim.danjuma'),
      userId: `usr_abj_clinician_${shortOwner}`,
      facilityId: abujaFacilityId,
      facilityCode: 'ACCH-ABJ',
      username: 'ibrahim.danjuma',
      normalizedUsername: 'ibrahim.danjuma',
      role: 'Doctor',
      departmentId: 'Internal Medicine',
      status: 'Active',
      permissions: DEFAULT_ROLE_PERMISSIONS.Doctor,
      createdAt: '2026-02-02T09:30:00.000Z',
      updatedAt: '2026-02-02T09:30:00.000Z',
      createdBy: 'system_bootstrap',
      displayName: 'Dr. Ibrahim Danjuma',
      email: 'ibrahim.danjuma@cedarcrest-demo.ng',
    },
    {
      membershipId: generateMembershipId(abujaFacilityId, 'halima.abdullahi'),
      userId: `usr_abj_admin_${shortOwner}`,
      facilityId: abujaFacilityId,
      facilityCode: 'ACCH-ABJ',
      username: 'halima.abdullahi',
      normalizedUsername: 'halima.abdullahi',
      role: 'FacilityAdmin',
      departmentId: 'Hospital Administration',
      status: 'Active',
      permissions: DEFAULT_ROLE_PERMISSIONS.FacilityAdmin,
      createdAt: '2026-02-02T09:10:00.000Z',
      updatedAt: '2026-02-02T09:10:00.000Z',
      createdBy: 'system_bootstrap',
      displayName: 'Halima Abdullahi',
      email: 'halima.abdullahi@cedarcrest-demo.ng',
    },
    // Same username ('musa') across TWO different hospitals
    {
      membershipId: generateMembershipId(abujaFacilityId, 'musa'),
      userId: `usr_abj_staff_${shortOwner}`,
      facilityId: abujaFacilityId,
      facilityCode: 'ACCH-ABJ',
      username: 'musa',
      normalizedUsername: 'musa',
      role: 'RecordsStaff',
      departmentId: 'Emergency & Acute Care',
      status: 'Active',
      permissions: DEFAULT_ROLE_PERMISSIONS.RecordsStaff,
      createdAt: '2026-02-03T08:45:00.000Z',
      updatedAt: '2026-02-03T08:45:00.000Z',
      createdBy: 'system_bootstrap',
      displayName: 'Musa Garba',
      email: 'musa.garba@cedarcrest-demo.ng',
    },
    {
      membershipId: generateMembershipId(phFacilityId, 'musa'),
      userId: `usr_ph_staff_${shortOwner}`,
      facilityId: phFacilityId,
      facilityCode: 'PRMC-PHC',
      username: 'musa', // Same username in different hospital
      normalizedUsername: 'musa',
      role: 'Nurse',
      departmentId: 'General Outpatient (GOPD)',
      status: 'Active',
      permissions: DEFAULT_ROLE_PERMISSIONS.Nurse,
      createdAt: '2026-02-19T08:30:00.000Z',
      updatedAt: '2026-02-19T08:30:00.000Z',
      createdBy: 'system_bootstrap',
      displayName: 'Blessing Musa Wike',
      email: 'blessing.wike@riverside-demo.ng',
    },
    // Port Harcourt Team
    {
      membershipId: generateMembershipId(phFacilityId, 'tamuno.briggs'),
      userId: `usr_ph_clinician_${shortOwner}`,
      facilityId: phFacilityId,
      facilityCode: 'PRMC-PHC',
      username: 'tamuno.briggs',
      normalizedUsername: 'tamuno.briggs',
      role: 'Doctor',
      departmentId: 'Family Medicine',
      status: 'Active',
      permissions: DEFAULT_ROLE_PERMISSIONS.Doctor,
      createdAt: '2026-02-18T11:00:00.000Z',
      updatedAt: '2026-02-18T11:00:00.000Z',
      createdBy: 'system_bootstrap',
      displayName: 'Dr. Tamuno Briggs',
      email: 'tamuno.briggs@riverside-demo.ng',
    },
    {
      membershipId: generateMembershipId(phFacilityId, 'ebiere.amachree'),
      userId: `usr_ph_admin_${shortOwner}`,
      facilityId: phFacilityId,
      facilityCode: 'PRMC-PHC',
      username: 'ebiere.amachree',
      normalizedUsername: 'ebiere.amachree',
      role: 'FacilityAdmin',
      departmentId: 'Hospital Administration',
      status: 'Active',
      permissions: DEFAULT_ROLE_PERMISSIONS.FacilityAdmin,
      createdAt: '2026-02-18T10:30:00.000Z',
      updatedAt: '2026-02-18T10:30:00.000Z',
      createdBy: 'system_bootstrap',
      displayName: 'Ebiere Amachree',
      email: 'ebiere.amachree@riverside-demo.ng',
    },
    // Demonstration of Suspended & Revoked memberships
    {
      membershipId: generateMembershipId(lagosFacilityId, 'dr.suspended'),
      userId: `usr_demo_suspended_${shortOwner}`,
      facilityId: lagosFacilityId,
      facilityCode: 'LLSC-VI',
      username: 'dr.suspended',
      normalizedUsername: 'dr.suspended',
      role: 'Doctor',
      departmentId: 'General Outpatient (GOPD)',
      status: 'Suspended',
      permissions: DEFAULT_ROLE_PERMISSIONS.Doctor,
      createdAt: '2026-02-01T08:00:00.000Z',
      updatedAt: '2026-02-15T12:00:00.000Z',
      createdBy: 'system_bootstrap',
      displayName: 'Dr. Suspended Demo',
      email: 'suspended.demo@lagoon-demo.ng',
    },
    {
      membershipId: generateMembershipId(lagosFacilityId, 'nurse.revoked'),
      userId: `usr_demo_revoked_${shortOwner}`,
      facilityId: lagosFacilityId,
      facilityCode: 'LLSC-VI',
      username: 'nurse.revoked',
      normalizedUsername: 'nurse.revoked',
      role: 'Nurse',
      departmentId: 'General Outpatient (GOPD)',
      status: 'Revoked',
      permissions: DEFAULT_ROLE_PERMISSIONS.Nurse,
      createdAt: '2026-02-01T08:00:00.000Z',
      updatedAt: '2026-02-20T14:00:00.000Z',
      createdBy: 'system_bootstrap',
      displayName: 'Nurse Revoked Demo',
      email: 'revoked.demo@lagoon-demo.ng',
    },
  ];

  return {
    facility,
    facilities,
    staffDirectory,
    facilityMemberships,
    patients,
    encounters,
    auditLogs,
  };
}
