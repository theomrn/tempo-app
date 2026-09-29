import { useState } from 'react';
import { Flag, Plus } from 'lucide-react';
import { api, json } from '../api';
import { dateFR } from '../format';
import type { Activity, Goal, Plan, Tag, Wellness } from '../types';
import { CalendarGrid } from '../components/CalendarGrid';
import { DayDetail } from '../components/DayDetail';
import { Empty, PageTitle } from '../components/Common';
import { PlanForm } from '../components/PlanForm';

export function CalendarPage({ activities, plans, goals, wellness, tags, initialDay,
  refresh, onSelectActivity, onError }: {
  activities: Activity[]; plans: Plan[]; goals: Goal[]; wellness: Wellness[]; tags: Tag[];
  initialDay: string | null; refresh: () => Promise<void>;
  onSelectActivity: (activity: Activity) => void; onError: (message: string) => void;
}) {
  const today = new Date();
  const [month, setMonth] = useState(initialDay ? Number(initialDay.slice(5, 7)) - 1 : today.getMonth());
  const [year, setYear] = useState(initialDay ? Number(initialDay.slice(0, 4)) : today.getFullYear());
  const [day, setDay] = useState<string | null>(initialDay);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planOpen, setPlanOpen] = useState(false);

  function shiftMonth(offset: number) {
    const date = new Date(year, month + offset);
    setMonth(date.getMonth());
    setYear(date.getFullYear());
  }

  function openPlan(plan: Plan | null) {
    setEditingPlan(plan);
    setPlanOpen(true);
  }

  async function addGoal() {
    const title = prompt('Nom de l’objectif');
    if (!title) return;
    const date = prompt('Date (AAAA-MM-JJ)', new Date().toISOString().slice(0, 10));
    if (!date) return;
    const target = prompt('Cible (facultatif)') ?? '';
    try {
      await api('/goals', json('POST', { title, date, target }));
      await refresh();
    } catch (error) { onError(String(error)); }
  }

  async function removeGoal(id: number) {
    if (!confirm('Supprimer cet objectif ?')) return;
    try {
      await api(`/goals/${id}`, { method: 'DELETE' });
      await refresh();
    } catch (error) { onError(String(error)); }
  }

  return <>
    <PageTitle kicker="PLANIFICATION" title="Calendrier" subtitle="Le prévu et le réalisé, côte à côte." />
    <div className="calendar-toolbar">
      <button onClick={() => shiftMonth(-1)}>←</button>
      <h2>{new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(year, month))}</h2>
      <button onClick={() => shiftMonth(1)}>→</button>
      <button className="primary" onClick={() => openPlan(null)}><Plus size={17} /> Ajouter une séance</button>
    </div>
    <CalendarGrid year={year} month={month} activities={activities} plans={plans} goals={goals} onDay={setDay} />
    {day && <DayDetail key={day} date={day} activities={activities} plans={plans} goals={goals} wellness={wellness}
      close={() => setDay(null)} editPlan={openPlan} newPlan={() => openPlan(null)}
      refresh={refresh} onSelectActivity={onSelectActivity} onError={onError} />}
    {planOpen && <PlanForm value={editingPlan} date={day ?? new Date().toISOString().slice(0, 10)}
      tags={tags} activities={activities} close={() => setPlanOpen(false)}
      saved={async () => { setPlanOpen(false); await refresh(); }} onError={onError} />}
    <div className="panel goals-panel">
      <div className="panel-head"><h3>Objectifs datés</h3>
        <button className="text-button" onClick={() => void addGoal()}>+ Ajouter un objectif</button>
      </div>
      {goals.map(goal => <div className="simple-row" key={goal.id}>
        <Flag size={18} /><div><b>{goal.title}</b><small>{dateFR(goal.date)}{goal.target ? ` · ${goal.target}` : ''}</small></div>
        <button className="text-button" onClick={() => void removeGoal(goal.id)}>Supprimer</button>
      </div>)}
      {!goals.length && <Empty text="Ajoutez une course ou un objectif de volume à une date précise." />}
    </div>
  </>;
}
