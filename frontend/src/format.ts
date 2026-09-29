export function dateFR(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(`${value.slice(0, 10)}T12:00:00`));
}

export function duration(seconds: number | null | undefined): string {
  if (seconds == null) return 'Indisponible';
  const rounded = Math.round(seconds);
  return [Math.floor(rounded / 3600), Math.floor(rounded % 3600 / 60), rounded % 60]
    .map(value => String(value).padStart(2, '0'))
    .join(':');
}

export function pace(seconds: number | null | undefined): string {
  if (seconds == null) return 'Indisponible';
  const rounded = Math.round(seconds);
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, '0')} min/km`;
}

export function number(value: number | null | undefined, digits = 1): string {
  if (value == null) return 'Indisponible';
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: digits }).format(value);
}

const COLORS: Record<string, string> = {
  course: '#7359e8', trail: '#e6a33b', vélo: '#4b9f83',
  natation: '#3f8fc4', musculation: '#dc765d', autre: '#777',
};

export function sportColor(sport: string): string {
  return COLORS[sport] ?? COLORS.autre;
}
