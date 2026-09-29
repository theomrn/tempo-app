import { useEffect, useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity as ActivityIcon, CalendarDays, Clock3, Flag, RefreshCw, TrendingUp } from 'lucide-react';
import { api } from '../api';
import { HEAT_LEVELS, heatLevel, SPORTS } from '../constants';
import { dateFR, duration, number, sportColor } from '../format';
import type { Activity, Dashboard, Page, Plan, StravaStatus } from '../types';
import { ActivityRow, Empty, PeriodSelector, Stat } from '../components/Common';

interface Props {
  activities: Activity[];
  plans: Plan[];
  status: StravaStatus | null;
  busy: boolean;
  period: string;
  revision: number;
  onPeriodChange: (period: string) => void;
  onNavigate: (page: Page) => void;
  onOpenDay: (date: string) => void;
  onSelectActivity: (activity: Activity) => void;
  onSync: () => void;
  onError: (message: string) => void;
}

function heatmapDays(entries: Dashboard['heatmap']) {
  const byDate = new Map(entries.map(entry => [entry.date, entry]));
  const today = new Date();
  const first = new Date(today);
  first.setDate(first.getDate() - 364 - first.getDay());
  const count = Math.floor((today.getTime() - first.getTime()) / 86400000) + 1;
  return Array.from({ length: count }, (_, index) => {
    const day = new Date(first);
    day.setDate(first.getDate() + index);
    const date = day.toISOString().slice(0, 10);
    return { date, data: byDate.get(date) };
  });
}

export function DashboardPage({ activities, plans, status, busy, period, revision,
  onPeriodChange, onNavigate, onOpenDay, onSelectActivity, onSync, onError }: Props) {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [year, setYear] = useState('all');
  const [distanceSport, setDistanceSport] = useState('course');

  useEffect(() => {
    let active = true;
    api<Dashboard>(`/dashboard?period=${period}&year=${year}`)
      .then(data => { if (active) setDashboard(data); })
      .catch(error => { if (active) onError(String(error)); });
    return () => { active = false; };
  }, [period, year, revision, onError]);

  const distanceSports = SPORTS.filter(sport =>
    activities.some(activity => activity.sport === sport && (activity.distance_km ?? 0) > 0)
  );
  const selectedDistanceSport = distanceSports.includes(distanceSport) ? distanceSport : distanceSports[0];
  const weekRows = dashboard?.weeks.map(week => ({
    week: week.week,
    ...Object.fromEntries(SPORTS.map(sport => [sport, week.sports[sport]?.duration_s ?? 0])),
  })) ?? [];
  const distanceRows = dashboard?.weeks.map(week => ({
    week: week.week, km: week.sports[selectedDistanceSport]?.distance_km ?? 0,
  })) ?? [];
  const heatDays = useMemo(() => heatmapDays(dashboard?.heatmap ?? []), [dashboard]);
  const summaries = Object.values(dashboard?.sports ?? {});
  const futurePlans = plans.filter(plan => plan.date >= new Date().toISOString().slice(0, 10)).slice(0, 2);

  return <>
    <div className="page-head">
      <div>
        <span className="eyebrow">VOTRE ESPACE D’ENTRAÎNEMENT</span>
        <h1>Vue d’ensemble<span className="accent">.</span></h1>
        <p>Tout votre mouvement, au même endroit.</p>
      </div>
      <button className="primary" disabled={busy || !status?.connected} onClick={onSync}>
        <RefreshCw size={17} className={busy ? 'spin' : ''} /> Synchroniser Strava
      </button>
    </div>
    {!status?.connected && <div className="hint">Strava n’est pas connecté.{' '}
      <button className="text-button" onClick={() => onNavigate('réglages')}>Configurer la connexion →</button>
    </div>}

    <div className="section-line"><div><span className="eyebrow">ANALYSE</span><h2>Votre rythme</h2></div>
      <PeriodSelector value={period} onChange={onPeriodChange} />
    </div>
    <div className="stats-grid">
      <Stat label="Temps de sport" value={duration(summaries.reduce((sum, sport) => sum + sport.duration_s, 0))} detail="sur la période" icon={<Clock3 />} />
      <Stat label="Activités" value={String(summaries.reduce((sum, sport) => sum + sport.count, 0))} detail="toutes sources" icon={<ActivityIcon />} />
      <Stat label="Distance course" value={`${number((dashboard?.sports.course?.distance_km ?? 0) + (dashboard?.sports.trail?.distance_km ?? 0))} km`} detail="course et trail" icon={<TrendingUp />} />
      <Stat label="Sports pratiqués" value={String(summaries.length)} detail="sur la période" icon={<Flag />} />
    </div>

    <div className="panel heat-panel">
      <div className="panel-head"><div><span className="eyebrow">12 MOIS GLISSANTS</span><h3>Carte d’activité</h3></div>
        <span className="muted">Chaque case représente un jour</span>
      </div>
      <div className="heat-scroll"><div className="heatmap">
        {heatDays.map(({ date, data }) => {
          const seconds = data?.duration_s ?? 0;
          const level = heatLevel(seconds);
          return <button key={date} className={`heat level-${level}`}
            title={`${dateFR(date)} · Couleur : ${HEAT_LEVELS[level]} · ${duration(seconds)} · ${data?.count ?? 0} activité(s) · ${data?.sports.join(', ') || 'aucun sport'}`}
            aria-label={`${dateFR(date)}, ${duration(seconds)}, ${data?.count ?? 0} activités`}
            onClick={() => onOpenDay(date)}
          />;
        })}
      </div></div>
      <div className="legend">Moins {HEAT_LEVELS.map((label, index) =>
        <i key={label} className={`level-${index}`} title={label} aria-label={label} />
      )} Plus</div>
    </div>

    <div className="two-col">
      <div className="panel">
        <div className="panel-head"><div><span className="eyebrow">VOLUME</span><h3>Temps de sport hebdomadaire</h3></div></div>
        <div className="chart"><ResponsiveContainer><BarChart data={weekRows}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="week" tickFormatter={value => value.slice(5)} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={value => duration(Number(value))} width={75} />
          <Tooltip formatter={(value, name) => [duration(Number(value)), name]} />
          <Legend />
          {SPORTS.map(sport => <Bar key={sport} dataKey={sport} stackId="a" fill={sportColor(sport)} />)}
        </BarChart></ResponsiveContainer></div>
      </div>
      <div className="panel">
        <div className="panel-head"><div><span className="eyebrow">DISTANCE</span><h3>Kilomètres par semaine</h3></div>
          <select value={selectedDistanceSport ?? ''} onChange={event => setDistanceSport(event.target.value)} disabled={!distanceSports.length}>
            {distanceSports.map(sport => <option key={sport}>{sport}</option>)}
          </select>
        </div>
        <div className="chart"><ResponsiveContainer><AreaChart data={distanceRows}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="week" tickFormatter={value => value.slice(5)} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} unit=" km" />
          <Tooltip formatter={value => [`${number(Number(value))} km`, 'Distance']} />
          <Area type="monotone" dataKey="km" stroke="#151515" fill="#e8e6df" strokeWidth={2} />
        </AreaChart></ResponsiveContainer></div>
      </div>
    </div>

    <div className="section-line"><div><span className="eyebrow">DÉTAIL</span><h2>Par sport</h2></div>
      <select aria-label="Année des statistiques par sport" value={year} onChange={event => setYear(event.target.value)}>
        <option value="all">Depuis le début</option>
        {Array.from(new Set(activities.map(activity => activity.start_at.slice(0, 4)))).sort().reverse()
          .map(value => <option key={value} value={value}>{value}</option>)}
      </select>
    </div>
    <div className="sport-grid">{Object.entries(dashboard?.sport_stats ?? {}).map(([sport, summary]) =>
      <div className="sport-card" key={sport}>
        <div className="sport-dot" style={{ background: sportColor(sport) }} />
        <h3>{sport}</h3><strong>{number(summary.distance_km)} <small>km</small></strong>
        <div className="mini-metrics">
          <span>{summary.count} activités</span><span>{duration(summary.duration_s)}</span>
          <span>{number(summary.elevation_m, 0)} m D+</span>
          <span>{summary.avg_hr == null ? 'FC indisponible' : `${summary.avg_hr} bpm`}</span>
        </div>
      </div>
    )}</div>

    <div className="two-col lower">
      <div className="panel"><div className="panel-head"><h3>Activités récentes</h3>
        <button className="text-button" onClick={() => onNavigate('activités')}>Tout voir →</button></div>
        {activities.slice(0, 4).map(activity => <ActivityRow key={activity.id} activity={activity} onClick={() => onSelectActivity(activity)} />)}
      </div>
      <div className="panel"><div className="panel-head"><h3>Prochaine séance</h3>
        <button className="text-button" onClick={() => onNavigate('calendrier')}>Calendrier →</button></div>
        {futurePlans.map(plan => <div className="simple-row" key={plan.id}><CalendarDays size={18} />
          <div><b>{plan.title}</b><small>{dateFR(plan.date)} · {plan.sport}</small></div>
        </div>)}
        {!futurePlans.length && <Empty text="Aucune séance prévue pour le moment." />}
      </div>
    </div>
    <div className="coverage">{dashboard?.coverage.note} {dashboard?.coverage.strava_activities ?? 0} activité(s) Strava incluse(s).</div>
  </>;
}
