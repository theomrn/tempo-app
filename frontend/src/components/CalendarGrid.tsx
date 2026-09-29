import { number } from '../format';
import type { Activity, Goal, Plan } from '../types';

const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export function CalendarGrid({ year, month, activities, plans, goals, onDay }: {
  year: number; month: number;
  activities: Activity[]; plans: Plan[]; goals: Goal[];
  onDay: (date: string) => void;
}) {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: offset + count }, (_, index) => index - offset + 1);
  const dateFor = (day: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return <div className="calendar">
    <div className="weekdays">{WEEKDAYS.map(day => <span key={day}>{day}</span>)}</div>
    <div className="calendar-grid">{days.map((day, index) => {
      if (day < 1) return <div className="cal-cell blank" key={`blank-${index}`} />;
      const date = dateFor(day);
      return <button className="cal-cell" key={date} onClick={() => onDay(date)}>
        <strong>{day}</strong>
        <div className="cal-items">
          {plans.filter(plan => plan.date === date).map(plan =>
            <span className="cal-pill planned" key={`plan-${plan.id}`}>{plan.title}</span>)}
          {activities.filter(activity => activity.start_at.slice(0, 10) === date).map(activity =>
            <span className="cal-pill done" key={`activity-${activity.id}`}>
              {activity.sport} · {activity.distance_km == null ? '—' : `${number(activity.distance_km)} km`}
            </span>)}
          {goals.filter(goal => goal.date === date).map(goal =>
            <span className="cal-pill goal" key={`goal-${goal.id}`}>⚑ {goal.title}</span>)}
        </div>
      </button>;
    })}</div>
  </div>;
}
