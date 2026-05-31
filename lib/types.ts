export interface SchoolAddress {
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  full: string | null;
}

export interface SchoolMetrics {
  rating: number | null;
  lowIncome: number | null;
  englishLearners: number | null;
  studentsPerTeacher: number | null;
  pctCertifiedTeachers: number | null;
}

export interface NearbyRef {
  id: number | null;
  name: string;
  path: string;
  distanceMi: number;
  type: string;
  grades: string;
}

export interface NearbySet {
  elementary: NearbyRef | null;
  middle: NearbyRef | null;
  high: NearbyRef | null;
}

export interface School {
  id: number | string;
  name: string;
  url: string;
  path: string | null;
  rating: number | null;
  level: string | null; // e | m | h
  type: string | null;
  grades: string | null;
  district: string | null;
  districtName?: string | null;
  districtUrl?: string | null;
  address: SchoolAddress;
  phone: string | null;
  lat: number | null;
  lng: number | null;
  metrics: SchoolMetrics;
  demographics: Record<string, number | null>;
  gender: { male: number | null; female: number | null };
  nearby?: NearbySet;
  scrapedAt: string;
}
