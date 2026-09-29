import { useState } from 'react';
import { api, json } from '../api';
import { SPORTS } from '../constants';
import { dateFR } from '../format';
import type { Activity, Plan, PlanPart, Tag } from '../types';
import { Modal } from './Common';

type PlanFormData = Omit<Plan, 'id'>;

const DEFAULT_PARTS: PlanPart[] = [
  { name: 'Échauffement', description: '', duration_s: null, distance_km: null, target: '' },
  { name: 'Cœur de séance', description: '', duration_s: null, distance_km: null, target: '' },
  { name: 'Retour au calme', description: '', duration_s: null, distance_km: null, target: '' },
];

export function PlanForm({ value, date, tags, activities, close, saved, onError }: {
  value: Plan | null; date: string;
  tags: Tag[]; activities: Activity[];
  close: () => void; saved: () => Promise<void>; onError: (message: string) => void;
}) {
  const [form, setForm] = useState<PlanFormData>(value ?? {
    title: '', sport: 'course', date, kind: 'simple', tag_id: null,
    duration_s: null, distance_km: null, notes: '', parts: DEFAULT_PARTS,
    activity_id: null,
  });

  function updatePart(index: number, change: Partial<PlanPart>) {
    setForm(current => ({ ...current, parts: current.parts.map((part, position) =>
      position === index ? { ...part, ...change } : part
    ) }));
  }

  async function save() {
    try {
      await api(value ? `/plans/${value.id}` : '/plans', json(value ? 'PUT' : 'POST', form));
      await saved();
    } catch (error) { onError(String(error)); }
  }

  async function remove() {
    if (!value || !confirm('Supprimer cette séance prévue ?')) return;
    try {
      await api(`/plans/${value.id}`, { method: 'DELETE' });
      await saved();
    } catch (error) { onError(String(error)); }
  }

  return <Modal title={value ? 'Modifier la séance' : 'Nouvelle séance'} close={close}>
    <form className="form" onSubmit={event => { event.preventDefault(); void save(); }}>
      <label>Titre<input required value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} /></label>
      <label>Date<input type="date" required value={form.date} onChange={event => setForm({ ...form, date: event.target.value })} /></label>
      <label>Sport<select value={form.sport} onChange={event => setForm({ ...form, sport: event.target.value })}>
        {SPORTS.map(sport => <option key={sport}>{sport}</option>)}
      </select></label>
      <label>Modèle<select value={form.kind} onChange={event => setForm({ ...form, kind: event.target.value })}>
        <option value="simple">Séance simple</option><option value="three">Trois parties</option>
      </select></label>
      <label>Étiquette<select value={form.tag_id ?? ''} onChange={event => setForm({ ...form, tag_id: event.target.value ? Number(event.target.value) : null })}>
        <option value="">Aucune</option>{tags.map(tag => <option value={tag.id} key={tag.id}>{tag.name}</option>)}
      </select></label>
      <label>Activité réalisée<select value={form.activity_id ?? ''} onChange={event => setForm({ ...form, activity_id: event.target.value ? Number(event.target.value) : null })}>
        <option value="">Non associée</option>
        {activities.map(activity => <option key={activity.id} value={activity.id}>{dateFR(activity.start_at)} · {activity.name}</option>)}
      </select></label>
      <label>Durée cible (min)<input type="number" min="0" value={form.duration_s == null ? '' : Math.round(form.duration_s / 60)}
        onChange={event => setForm({ ...form, duration_s: event.target.value ? Number(event.target.value) * 60 : null })} /></label>
      <label>Distance cible (km)<input type="number" step="0.01" min="0" value={form.distance_km ?? ''}
        onChange={event => setForm({ ...form, distance_km: event.target.value ? Number(event.target.value) : null })} /></label>
      <label className="full">Notes<textarea value={form.notes ?? ''} onChange={event => setForm({ ...form, notes: event.target.value })} /></label>

      {form.kind === 'three' && <div className="full parts">{form.parts.map((part, index) =>
        <div className="part" key={part.name}>
          <h4>{part.name}</h4>
          <textarea placeholder="Description libre" value={part.description ?? ''} onChange={event => updatePart(index, { description: event.target.value })} />
          <div className="part-fields">
            <label>Durée (min)<input type="number" step="any" value={part.duration_s == null ? '' : part.duration_s / 60}
              onChange={event => updatePart(index, { duration_s: event.target.value ? Number(event.target.value) * 60 : null })} /></label>
            <label>Distance (km)<input type="number" step="any" value={part.distance_km ?? ''}
              onChange={event => updatePart(index, { distance_km: event.target.value ? Number(event.target.value) : null })} /></label>
            <label>Cible allure ou FC<input value={part.target ?? ''} onChange={event => updatePart(index, { target: event.target.value })} /></label>
          </div>
        </div>
      )}</div>}
      <button className="primary full">Enregistrer la séance</button>
    </form>
    {value && <button className="danger" onClick={() => void remove()}>Supprimer la séance</button>}
  </Modal>;
}
