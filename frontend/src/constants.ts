export const SPORTS = ['course', 'vélo', 'natation', 'musculation', 'trail', 'autre'];

export const PERIODS = [
  { value: '1m', label: '1 mois' },
  { value: '3m', label: '3 mois' },
  { value: '6m', label: '6 mois' },
  { value: '1a', label: '1 an' },
  { value: 'all', label: 'Depuis le début' },
];

export const HEAT_LEVELS = [
  '0 min (aucune activité)',
  'Moins de 30 min',
  '30 à moins de 60 min',
  '60 à moins de 120 min',
  '120 min ou plus',
];

export function heatLevel(seconds: number): number {
  const minutes = seconds / 60;
  if (minutes === 0) return 0;
  if (minutes < 30) return 1;
  if (minutes < 60) return 2;
  if (minutes < 120) return 3;
  return 4;
}
