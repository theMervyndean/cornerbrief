/**
 * CornerBrief Official Healthcare Photography Assets
 *
 * High-resolution clinical environments representing the full continuum of
 * hospital care: Emergency Triage, Multidisciplinary Ward Rounds, Bedside Nursing,
 * Outpatient Consultations with NONYE AI, and Panoramic Care Journeys.
 */

export interface ClinicalImageAsset {
  id: string;
  title: string;
  category: string;
  src: string;
  fallbackSrc: string;
  alt: string;
  description: string;
  aspectRatio: '16:9' | '4:3' | '3:2' | '21:9';
  clinicalContext: string;
}

export const CORNERBRIEF_ASSETS = {
  // Hero Visual: Doctor Consultation with NONYE AI tablet & EHR monitor
  heroDoctorConsultation: {
    id: 'hero-doctor-consultation',
    title: 'Modern Digital Health Consultation with NONYE AI',
    category: 'Outpatient & Ambulatory Care',
    src: '/assets/aistudio/Modern_Digital_Health_Consultation_e4904136.png',
    fallbackSrc: '/images/hero-doctor-consultation.png',
    alt: 'African female physician consulting patient with electronic health record monitor and NONYE AI clinical assistant tablet',
    description:
      'Attending physician reviewing vital signs and treatment plans with a patient, accompanied by NONYE AI automated documentation on tablet and comprehensive EHR chart on desktop monitor.',
    aspectRatio: '16:9',
    clinicalContext: 'Outpatient consultation room, clinical note structuring, patient encounter history, preventive care planning',
  } as ClinicalImageAsset,

  // Full-width Care Journey: Multi-stage hospital continuum
  careJourneyPanoramic: {
    id: 'care-journey-panoramic',
    title: 'Comprehensive Healthcare Care Journey',
    category: 'Full-Spectrum Hospital Operations',
    src: '/assets/aistudio/Comprehensive_African_Healthcare_Care_Journey_e19ff63d.png',
    fallbackSrc: '/images/care-journey-panoramic.png',
    alt: 'Multi-panel collage showcasing doctor consultation, surgical procedure theatre, diagnostic review, laboratory telemetry, and inpatient bedside care',
    description:
      'Continuous healthcare delivery journey connecting outpatient triage, surgical theatre operations, telemetry diagnostics, and inpatient bedside recovery.',
    aspectRatio: '16:9',
    clinicalContext: 'Cross-departmental care delivery across triage, specialist surgery, radiology telemetry, and nursing wards',
  } as ClinicalImageAsset,

  // Emergency Triage
  emergencyTriageTeam: {
    id: 'emergency-triage-team',
    title: 'Emergency & Acute Triage in Action',
    category: 'Emergency & Acute Care',
    src: '/assets/aistudio/Emergency_Triage_Team_in_Action_5d5efb69.png',
    fallbackSrc: '/images/emergency-triage-team.png',
    alt: 'Emergency department triage team attending patient on stretcher with continuous vital signs monitor and triage acuity levels',
    description:
      'Rapid physiological assessment, continuous vital signs monitoring, triage acuity categorization (Levels 1-5), and acute clinician handover.',
    aspectRatio: '16:9',
    clinicalContext: 'Acute triage bay, emergency intake, blood pressure, pulse, SpO2 telemetry, immediate clinical notes',
  } as ClinicalImageAsset,

  // Multidisciplinary Ward Rounds
  wardRoundsCollaborative: {
    id: 'ward-rounds-collaborative',
    title: 'Collaborative Hospital Ward Rounds',
    category: 'Multidisciplinary Inpatient Care',
    src: '/assets/aistudio/Collaborative_Hospital_Ward_Rounds_3f8c4759.png',
    fallbackSrc: '/images/ward-rounds-collaborative.png',
    alt: 'Attending physician, specialist, and nursing team conducting bedside rounds with digital patient overview display and mobile tablets',
    description:
      'Attending physicians, clinical specialists, and charge nurses conducting structured bedside rounds reviewing longitudinal encounter timelines and medication plans.',
    aspectRatio: '16:9',
    clinicalContext: 'Inpatient medical-surgical ward, multidisciplinary team rounds, digital bedside chart, care plan coordination',
  } as ClinicalImageAsset,

  // Bedside Nursing & Specialist Recovery
  caringTeamBedside: {
    id: 'caring-team-bedside',
    title: 'Caring Team in Modern Hospital Room',
    category: 'Bedside Nursing & Recovery',
    src: '/assets/aistudio/Caring_Team_in_a_Modern_Hospital_Room_31ec330b.png',
    fallbackSrc: '/images/caring-team-bedside.png',
    alt: 'Doctor and nursing care team supporting recovering patient at bedside in private modern hospital room with cardiac monitor',
    description:
      'Compassionate clinical team providing direct inpatient bedside care, monitoring physiological parameters, and reviewing post-procedure recovery.',
    aspectRatio: '16:9',
    clinicalContext: 'Inpatient recovery room, continuous telemetry, IV therapy, empathetic clinician-patient communication',
  } as ClinicalImageAsset,
};

export const CLINICAL_IMAGES_LIST: ClinicalImageAsset[] = [
  CORNERBRIEF_ASSETS.heroDoctorConsultation,
  CORNERBRIEF_ASSETS.careJourneyPanoramic,
  CORNERBRIEF_ASSETS.emergencyTriageTeam,
  CORNERBRIEF_ASSETS.wardRoundsCollaborative,
  CORNERBRIEF_ASSETS.caringTeamBedside,
];
