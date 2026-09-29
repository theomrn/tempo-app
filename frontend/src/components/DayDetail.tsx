import { useState } from 'react';
import { Flag } from 'lucide-react';
import { api, json } from '../api';
import { dateFR, duration, number } from '../format';
import type { Activity, Goal, Plan, Wellness } from '../types';
import { ActivityRow, Empty, Modal } from './Common';

export function DayDetail({ date, activities, plans, goals, wellness, close,
  editPlan, newPlan, refresh, onSelectActivity, onError }: {
  date: string;
  activities: Activity[]; plans: Plan[]; goals: Goal[]; wellness: Wellness[];
  close: () => void; editPlan: (plan: Plan) => void; newPlan: () => void;
  refresh: () => Promise<void>; onError: (message: string) => void;
  onSelectActivity: (activity: Activity) => void;
}) {
  const current = wellness.find(entry => entry.date === date);
  const [sleep, setSleep] = useState(current?.sleep_min?.toString() ?? '');
  const [hrv, setHrv] = useState(current?.hrv_ms?.toString() ?? '');
  const [note, setNote] = useState(current?.note ?? '');
  const dayPlans = plans.filter(plan => plan.date === date);
  const dayActivities = activities.filter(activity => activity.start_at.slice(0, 10) === date);

  async function saveWellness() {
    try {
      await api(`/wellness/${date}`, json('PUT', {
        date, sleep_min: sleep ? Number(sleep) : null,
        hrv_ms: hrv ? Number(hrv) : null, note,
      }));
      await refresh();
      close();
    } catch (error) { onError(String(error)); }
  }

  return <Modal title={dateFR(date)} close={close}>
    <div className="day-section">
      <div className="panel-head"><h3>Séances prévues</h3><button className="text-button" onClick={newPlan}>+ Ajouter</button></div>
      {dayPlans.map(plan => {
        const activity = activities.find(item => item.id === plan.activity_id);
        return <div className="day-card" key={plan.id}>
          <div className="panel-head"><b>{plan.title}</b><button className="text-button" onClick={() => editPlan(plan)}>Modifier / déplacer</button></div>
          <p>{plan.sport} · {plan.kind === 'three' ? 'Trois parties' : 'Simple'}</p>
          {plan.notes && <p>{plan.notes}</p>}
          {plan.kind === 'three' && plan.parts.map((part, index) =>
            <p key={index}><b>{part.name}</b> · {part.description} {part.target ? ` · ${part.target}` : ''}</p>)}
          <div className="compare">
            <span>PRÉVU<strong>{plan.distance_km == null ? '—' : `${number(plan.distance_km)} km`}</strong><small>{duration(plan.duration_s)}</small></span>
            <span>RÉALISÉ<strong>{activity?.distance_km == null ? '—' : `${number(activity.distance_km)} km`}</strong><small>{duration(activity?.duration_s)}</small></span>
          </div>
        </div>;
      })}
      {!dayPlans.length && <Empty text="Aucune séance prévue." />}
    </div>
    <div className="day-section"><h3>Activités réalisées</h3>
      {dayActivities.map(activity => <ActivityRow key={activity.id} activity={activity}
        onClick={() => onSelectActivity(activity)} />)}
      {!dayActivities.length && <Empty text="Aucune activité réalisée ce jour." />}
    </div>
    {goals.filter(goal => goal.date === date).map(goal =>
      <div className="day-card" key={goal.id}><Flag size={16} /> {goal.title} · {goal.target}</div>)}
    <form className="wellness-form" onSubmit={event => { event.preventDefault(); void saveWellness(); }}>
      <h3>Sommeil et VFC</h3>
      <label>Sommeil (minutes)<input type="number" min="0" value={sleep} onChange={event => setSleep(event.target.value)} /></label>
      <label>VFC (ms)<input type="number" min="0" step="0.1" value={hrv} onChange={event => setHrv(event.target.value)} /></label>
      <label>Note<textarea value={note} onChange={event => setNote(event.target.value)} /></label>
      <button className="primary">Enregistrer</button>
    </form>
  </Modal>;
}
