import { useEffect, useState } from 'react';
import { api } from '../api';
import { SPORTS } from '../constants';
import type { Activity, Tag, Trends } from '../types';
import { PageTitle, PeriodSelector } from '../components/Common';
import { TrendChart } from '../components/TrendChart';

export function TrendsPage({ activities, tags, period, revision, onPeriodChange, onSelectActivity, onError }: {
  activities: Activity[];
  tags: Tag[];
  period: string;
  revision: number;
  onPeriodChange: (period: string) => void;
  onSelectActivity: (activity: Activity) => void;
  onError: (message: string) => void;
}) {
  const [sport, setSport] = useState('tous');
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [trends, setTrends] = useState<Trends | null>(null);
  const tagQuery = selectedTags.join(',');
  const distanceSports = SPORTS.filter(value => activities.some(activity =>
    activity.sport === value && (activity.distance_km ?? 0) > 0
  ));

  useEffect(() => {
    let active = true;
    api<Trends>(`/trends?period=${period}&sport=${encodeURIComponent(sport)}&tags=${tagQuery}`)
      .then(data => { if (active) setTrends(data); })
      .catch(error => { if (active) onError(String(error)); });
    return () => { active = false; };
  }, [period, sport, tagQuery, revision, onError]);

  async function openPoint(id: number) {
    try {
      onSelectActivity(await api<Activity>(`/activities/${id}`));
    } catch (error) {
      onError(String(error));
    }
  }

  function toggleTag(id: number) {
    setSelectedTags(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);
  }

  const points = trends?.points ?? [];
  const wellness = trends?.wellness ?? [];
  return <>
    <PageTitle kicker="ÉVOLUTION" title="Tendances" subtitle="Suivez vos mesures dans le temps, sans jugement automatique." />
    <div className="section-line">
      <PeriodSelector value={period} onChange={onPeriodChange} />
      <div className="filter-inline"><select value={sport} onChange={event => setSport(event.target.value)}>
        <option value="tous">Tous les sports</option>
        {distanceSports.map(value => <option key={value}>{value}</option>)}
      </select></div>
    </div>
    <div className="tag-filters">{tags.map(tag => <button key={tag.id}
      className={selectedTags.includes(tag.id) ? 'selected' : ''} onClick={() => toggleTag(tag.id)}>
      <i style={{ background: tag.color }} />{tag.name}
    </button>)}</div>
    <div className="two-col">
      <TrendChart title="Allure moyenne" data={points} field="pace_s_km" unit="min/km" onPoint={id => void openPoint(id)} />
      <TrendChart title="Fréquence cardiaque moyenne" data={points} field="avg_hr" unit="bpm" onPoint={id => void openPoint(id)} />
      <TrendChart title="Dénivelé" data={points} field="elevation_m" unit="m" onPoint={id => void openPoint(id)} />
      <TrendChart title="Durée" data={points} field="duration_s" unit="hh:mm:ss" onPoint={id => void openPoint(id)} />
      <TrendChart title="Sommeil" data={wellness.map(value => ({ start_at: value.date, sleep_min: value.sleep_min }))} field="sleep_min" unit="min" />
      <TrendChart title="VFC" data={wellness.map(value => ({ start_at: value.date, hrv_ms: value.hrv_ms }))} field="hrv_ms" unit="ms" />
    </div>
    <div className="coverage">{trends?.coverage} Sélectionnez EF pour observer uniquement les sorties que vous avez marquées ainsi.</div>
  </>;
}
