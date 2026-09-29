import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { duration, number, pace } from '../format';
import { Empty } from './Common';

type TrendField = 'pace_s_km' | 'avg_hr' | 'elevation_m' | 'duration_s' | 'sleep_min' | 'hrv_ms';

interface TrendPoint {
  start_at: string;
  id?: number;
  pace_s_km?: number | null;
  avg_hr?: number | null;
  elevation_m?: number | null;
  duration_s?: number | null;
  sleep_min?: number | null;
  hrv_ms?: number | null;
}

export function TrendChart({ title, data, field, unit, onPoint }: {
  title: string;
  data: TrendPoint[];
  field: TrendField;
  unit: string;
  onPoint?: (id: number) => void;
}) {
  const rows = data.flatMap(point => {
    const value = point[field];
    if (value == null) return [];
    return [{ date: point.start_at.slice(0, 10), value, id: point.id }];
  });

  function formatValue(value: number) {
    if (field === 'pace_s_km') return pace(value);
    if (field === 'duration_s') return duration(value);
    return `${number(value)} ${unit}`;
  }

  return <div className="panel">
    <div className="panel-head"><div><span className="eyebrow">TENDANCE</span><h3>{title}</h3></div><span className="muted">{unit}</span></div>
    <div className="chart">{rows.length ? <ResponsiveContainer><LineChart data={rows}
      onClick={state => {
        const index = state?.activeTooltipIndex;
        if (typeof index !== 'number') return;
        const id = rows[index]?.id;
        if (id != null) onPoint?.(id);
      }}>
      <CartesianGrid strokeDasharray="3 3" vertical={false} />
      <XAxis dataKey="date" tickFormatter={value => value.slice(5)} tick={{ fontSize: 11 }} />
      <YAxis tick={{ fontSize: 11 }} tickFormatter={value =>
        field === 'pace_s_km' ? pace(Number(value)).replace(' min/km', '') :
          field === 'duration_s' ? duration(Number(value)) : number(Number(value))
      } width={field === 'duration_s' ? 75 : 45} />
      <Tooltip formatter={value => [formatValue(Number(value)), title]} />
      <Line type="monotone" dataKey="value" stroke="#151515" strokeWidth={2.5}
        dot={{ r: 4, fill: '#7359e8' }} activeDot={{ r: 7, cursor: 'pointer' }} />
    </LineChart></ResponsiveContainer> : <Empty text="Aucune mesure disponible pour cette sélection." />}</div>
  </div>;
}
