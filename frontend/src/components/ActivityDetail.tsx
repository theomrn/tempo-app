import { useState } from 'react';
import { Activity as ActivityIcon, Clock3, Flag, HeartPulse, TrendingUp } from 'lucide-react';
import { api, json } from '../api';
import { SPORTS } from '../constants';
import { dateFR, duration, number, pace } from '../format';
import type { Activity, Tag } from '../types';
import { Modal, Stat } from './Common';

interface EditForm {
  name: string;
  sport: string;
  start_at: string;
  distance_km: number | null;
  duration_s: number | null;
  elevation_m: number | null;
  avg_hr: number | null;
  tag_ids: number[];
}

export function ActivityDetail({ activity, tags, close, onSaved, onError }: {
  activity: Activity;
  tags: Tag[];
  close: () => void;
  onSaved: (activity: Activity | null) => void;
  onError: (message: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditForm>({
    name: activity.name,
    sport: activity.sport,
    start_at: activity.start_at,
    distance_km: activity.distance_km,
    duration_s: activity.duration_s,
    elevation_m: activity.elevation_m,
    avg_hr: activity.avg_hr,
    tag_ids: activity.tags.map(tag => tag.id),
  });

  async function save() {
    try {
      const updated = await api<Activity>(`/activities/${activity.id}`, json('PATCH', form));
      setEditing(false);
      onSaved(updated);
    } catch (error) { onError(String(error)); }
  }

  async function remove() {
    if (!confirm('Supprimer définitivement cette activité locale ?')) return;
    try {
      await api(`/activities/${activity.id}`, { method: 'DELETE' });
      onSaved(null);
    } catch (error) { onError(String(error)); }
  }

  return <Modal title={activity.name} close={close}>
    <div className="detail-meta">{dateFR(activity.start_at)} · {activity.sport} · Source : {activity.source.toUpperCase()}</div>
    <div className="detail-stats">
      <Stat label="Distance" value={activity.distance_km == null ? 'Indisponible' : `${number(activity.distance_km)} km`} detail="" icon={<TrendingUp />} />
      <Stat label="Durée" value={duration(activity.duration_s)} detail="" icon={<Clock3 />} />
      <Stat label="Allure" value={pace(activity.pace_s_km)} detail="" icon={<ActivityIcon />} />
      <Stat label="Dénivelé" value={activity.elevation_m == null ? 'Indisponible' : `${number(activity.elevation_m)} m`} detail="" icon={<Flag />} />
      <Stat label="FC moyenne" value={activity.avg_hr == null ? 'Indisponible' : `${number(activity.avg_hr, 0)} bpm`} detail="" icon={<HeartPulse />} />
    </div>
    <p className="muted">Nom d’origine : {activity.source_name} · Type d’origine : {activity.source_sport}</p>

    {editing ? <form className="form" onSubmit={event => { event.preventDefault(); void save(); }}>
      <label>Nom<input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label>
      <label>Sport<select value={form.sport} onChange={event => setForm({ ...form, sport: event.target.value })}>
        {SPORTS.map(sport => <option key={sport}>{sport}</option>)}
      </select></label>
      <label>Date<input type="datetime-local" value={form.start_at.slice(0, 16)} onChange={event => setForm({ ...form, start_at: event.target.value })} /></label>
      {([
        ['distance_km', 'Distance (km)'], ['duration_s', 'Durée (secondes)'],
        ['elevation_m', 'Dénivelé (m)'], ['avg_hr', 'FC moyenne (bpm)'],
      ] as const).map(([field, label]) =>
        <label key={field}>{label}<input type="number" step="any" value={form[field] ?? ''}
          onChange={event => setForm({ ...form, [field]: event.target.value === '' ? null : Number(event.target.value) })} />
        </label>
      )}
      <div className="full"><b>Étiquettes manuelles</b><div className="tag-filters">
        {tags.map(tag => <label key={tag.id}><input type="checkbox" checked={form.tag_ids.includes(tag.id)}
          onChange={event => setForm({ ...form, tag_ids: event.target.checked
            ? [...form.tag_ids, tag.id] : form.tag_ids.filter(id => id !== tag.id) })} />{tag.name}</label>)}
      </div></div>
      <button className="primary">Enregistrer</button>
    </form> : <div className="tag-filters">
      {activity.tags.map(tag => <span className="tag" key={tag.id} style={{ background: `${tag.color}22`, color: tag.color }}>{tag.name}</span>)}
    </div>}
    <div className="button-row">
      <button className="outline" onClick={() => setEditing(!editing)}>{editing ? 'Annuler' : 'Modifier'}</button>
      <button className="danger" onClick={() => void remove()}>Supprimer localement</button>
    </div>
    {activity.source === 'strava' && <p className="coverage">Cette activité Strava est incluse dans les statistiques. Une suppression locale empêchera son retour lors des prochaines synchronisations.</p>}
  </Modal>;
}
