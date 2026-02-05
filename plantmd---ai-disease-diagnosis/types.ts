export interface DiagnosisResult {
  id?: string;
  date?: string;
  plantType?: string;
  symptoms?: string;
  image?: string;
  diseaseName: string;
  confidence: number;
  severity: 'Mild' | 'Moderate' | 'Severe';
  affectedParts: string[];
  description: string;
  causes: string;
  spreadRisk: string;
  organicTreatment: string[];
  chemicalTreatment: string[];
  preventiveMeasures: string[];
  urgency: string;
  recoveryTimeline: string;
  additionalNotes?: string;
}

export enum AppView {
  LANDING = 'LANDING',
  UPLOAD = 'UPLOAD',
  ANALYSIS = 'ANALYSIS',
  RESULTS = 'RESULTS',
  EXPERTS = 'EXPERTS',
  HISTORY = 'HISTORY',
  DASHBOARD = 'DASHBOARD',
  AR_SCANNER = 'AR_SCANNER',
  VOICE_ASSISTANT = 'VOICE_ASSISTANT'
}

export interface PlantHistoryItem extends DiagnosisResult {}

export interface ExpertProfile {
  id: string;
  name: string;
  role: string;
  specialization: string;
  distance: string;
  rating: number;
  imageUrl: string;
  reviews: number;
  email: string;
  phone: string;
}

export interface SensorData {
  id: string;
  type: 'Moisture' | 'pH' | 'Temperature' | 'Humidity';
  value: number;
  unit: string;
  status: 'Normal' | 'Warning' | 'Critical';
  lastUpdated: string;
}