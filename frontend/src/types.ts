export type Page = 'accueil' | 'activités' | 'tendances' | 'calendrier' | 'records' | 'réglages';

export interface Tag { id: number; name: string; color: string }

export interface Activity {
  id: number;
  source: string;
  name: string;
  source_name: string;
  sport: string;
  source_sport: string;
  start_at: string;
  distance_km: number | null;
  duration_s: number | null;
  elevation_m: number | null;
  avg_hr: number | null;
  pace_s_km: number | null;
  tags: Tag[];
  analytics_eligible: boolean;
}

export interface PlanPart {
  name: string;
  description?: string;
  duration_s?: number | null;
  distance_km?: number | null;
  target?: string;
}

export interface Plan {
  id: number;
  title: string;
  sport: string;
  date: string;
  kind: string;
  tag_id: number | null;
  duration_s: number | null;
  distance_km: number | null;
  notes: string | null;
  parts: PlanPart[];
  activity_id: number | null;
}

export interface Goal { id: number; title: string; date: string; target: string | null }
export interface Wellness { date: string; sleep_min: number | null; hrv_ms: number | null; note: string | null }

export interface SportSummary {
  distance_km: number;
  duration_s: number;
  count: number;
  elevation_m: number;
  avg_hr: number | null;
}

export interface Dashboard {
  weeks: {
    week: string;
    sports: Record<string, { duration_s: number; distance_km: number; count: number }>;
  }[];
  sports: Record<string, SportSummary>;
  sport_stats: Record<string, SportSummary>;
  heatmap: { date: string; duration_s: number; count: number; sports: string[] }[];
  coverage: { fit_activities: number; demo_activities: number; strava_activities: number; note: string };
}

export interface Trends {
  points: Activity[];
  wellness: Pick<Wellness, 'date' | 'sleep_min' | 'hrv_ms'>[];
  coverage: string;
}

export interface RecordResult {
  sport: string;
  label: string;
  activity_id: number;
  date: string;
  kind: string;
  distance_km?: number;
  duration_s?: number;
  pace_s_km?: number;
}

export interface RecordsResponse { records: RecordResult[]; note: string }
export interface StravaStatus {
  configured: boolean;
  connected: boolean;
  last_sync: string | null;
  last_result: string | null;
}
export interface ImportReport { files: { file: string; status: string; reason?: string }[] }
