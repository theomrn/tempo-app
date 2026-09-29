import { useEffect, useState } from 'react';
import { api } from '../api';
import { dateFR, duration, number, pace } from '../format';
import type { Activity, RecordsResponse } from '../types';
import { Empty, PageTitle } from '../components/Common';

export function RecordsPage({ revision, onSelectActivity, onError }: {
  revision: number;
  onSelectActivity: (activity: Activity) => void;
  onError: (message: string) => void;
}) {
  const [data, setData] = useState<RecordsResponse | null>(null);

  useEffect(() => {
    let active = true;
    api<RecordsResponse>('/records')
      .then(result => { if (active) setData(result); })
      .catch(error => { if (active) onError(String(error)); });
    return () => { active = false; };
  }, [revision, onError]);

  async function openActivity(id: number) {
    try {
      onSelectActivity(await api<Activity>(`/activities/${id}`));
    } catch (error) { onError(String(error)); }
  }

  return <>
    <PageTitle kicker="REPÈRES" title="Mes records" subtitle="Les meilleurs efforts que les données permettent de vérifier." />
    <div className="record-grid">{data?.records.map(record =>
      <div className="record-card" key={`${record.sport}-${record.label}-${record.activity_id}`}>
        <span className="eyebrow">{record.sport.toUpperCase()} · {record.kind}</span>
        <h3>{record.label}</h3>
        <strong>{record.duration_s != null ? duration(record.duration_s) : `${number(record.distance_km)} km`}</strong>
        <p>{record.pace_s_km != null ? `${pace(record.pace_s_km)} · ` : ''}{dateFR(record.date)}</p>
        <button className="text-button" onClick={() => void openActivity(record.activity_id)}>Voir l’activité →</button>
      </div>
    )}</div>
    {data && !data.records.length && <Empty text="Aucun record calculable. Pour les efforts sur une distance précise, importez des FIT avec des points horodatés." />}
    <div className="coverage">{data?.note}</div>
  </>;
}
