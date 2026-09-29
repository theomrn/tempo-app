import type { ReactNode } from 'react';
import { Activity as ActivityIcon, X } from 'lucide-react';
import { PERIODS } from '../constants';
import { dateFR, duration, number, sportColor } from '../format';
import type { Activity } from '../types';

export function PageTitle({ kicker, title, subtitle }: {
  kicker: string; title: string; subtitle: string;
}) {
  return <div className="page-head"><div>
    <span className="eyebrow">{kicker}</span>
    <h1>{title}<span className="accent">.</span></h1>
    <p>{subtitle}</p>
  </div></div>;
}

export function Stat({ label, value, detail, icon }: {
  label: string; value: string; detail: string; icon: ReactNode;
}) {
  return <div className="stat">
    <span className="stat-icon">{icon}</span>
    <span className="stat-label">{label}</span>
    <strong>{value}</strong>
    <small>{detail}</small>
  </div>;
}

export function Empty({ text }: { text: string }) {
  return <div className="empty">{text}</div>;
}

export function PeriodSelector({ value, onChange }: {
  value: string; onChange: (value: string) => void;
}) {
  return <div className="segmented" aria-label="Période des graphiques">
    {PERIODS.map(period => <button
      key={period.value}
      className={value === period.value ? 'active' : ''}
      onClick={() => onChange(period.value)}
    >{period.label}</button>)}
  </div>;
}

export function ActivityRow({ activity, onClick }: {
  activity: Activity; onClick: () => void;
}) {
  const color = sportColor(activity.sport);
  return <button className="activity-row" onClick={onClick}>
    <span className="activity-symbol" style={{ color, background: `${color}18` }}>
      <ActivityIcon size={19} />
    </span>
    <span className="activity-main">
      <b>{activity.name}</b>
      <small>{dateFR(activity.start_at)} · {activity.sport} · {activity.source.toUpperCase()}</small>
    </span>
    <span className="activity-numbers">
      <b>{activity.distance_km == null ? '—' : `${number(activity.distance_km)} km`}</b>
      <small>{duration(activity.duration_s)}</small>
    </span>
    <span className="arrow">↗</span>
  </button>;
}

export function Modal({ title, close, children }: {
  title: string; close: () => void; children: ReactNode;
}) {
  return <div className="modal-back" onMouseDown={close}>
    <div className="modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={event => event.stopPropagation()}>
      <div className="modal-head">
        <h2>{title}</h2>
        <button className="icon-btn" onClick={close} aria-label="Fermer"><X /></button>
      </div>
      {children}
    </div>
  </div>;
}
