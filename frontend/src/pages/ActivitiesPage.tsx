import { useState } from 'react';
import { Search } from 'lucide-react';
import { SPORTS } from '../constants';
import type { Activity, Tag } from '../types';
import { ActivityDetail } from '../components/ActivityDetail';
import { ActivityRow, Empty, PageTitle } from '../components/Common';

export function ActivitiesPage({ activities, tags, selected, onSelect, onRefresh, onError }: {
  activities: Activity[];
  tags: Tag[];
  selected: Activity | null;
  onSelect: (activity: Activity | null) => void;
  onRefresh: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [sport, setSport] = useState('');
  const [tagId, setTagId] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  const filtered = activities.filter(activity =>
    (!query || activity.name.toLowerCase().includes(query.toLowerCase())) &&
    (!sport || activity.sport === sport) &&
    (!tagId || activity.tags.some(tag => tag.id === Number(tagId))) &&
    (!start || activity.start_at.slice(0, 10) >= start) &&
    (!end || activity.start_at.slice(0, 10) <= end)
  );

  async function handleSaved(activity: Activity | null) {
    await onRefresh();
    onSelect(activity);
  }

  return <>
    <PageTitle kicker="JOURNAL" title="Mes activités" subtitle="Retrouvez et organisez toutes vos séances réalisées." />
    <div className="filters">
      <label className="search"><Search size={17} /><input placeholder="Rechercher une activité" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <select value={sport} onChange={event => setSport(event.target.value)}>
        <option value="">Tous les sports</option>{SPORTS.map(value => <option key={value}>{value}</option>)}
      </select>
      <select value={tagId} onChange={event => setTagId(event.target.value)}>
        <option value="">Toutes les étiquettes</option>{tags.map(tag => <option value={tag.id} key={tag.id}>{tag.name}</option>)}
      </select>
      <input aria-label="Date de début" type="date" value={start} onChange={event => setStart(event.target.value)} />
      <input aria-label="Date de fin" type="date" value={end} onChange={event => setEnd(event.target.value)} />
    </div>
    <div className="panel list-panel">
      <div className="panel-head"><h3>{filtered.length} activités</h3><span className="muted">FIT, démonstration et Strava · provenance indiquée</span></div>
      {filtered.map(activity => <ActivityRow key={activity.id} activity={activity} onClick={() => onSelect(activity)} />)}
      {!filtered.length && <Empty text="Aucune activité ne correspond à ces filtres. Importez vos fichiers FIT dans Paramètres." />}
    </div>
    {selected && <ActivityDetail key={selected.id} activity={selected} tags={tags} close={() => onSelect(null)}
      onSaved={activity => void handleSaved(activity)} onError={onError} />}
  </>;
}
