import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { Activity, Goal, ImportReport, Plan, StravaStatus, Tag, Wellness } from '../types';

export function useAppData() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [wellness, setWellness] = useState<Wellness[]>([]);
  const [status, setStatus] = useState<StravaStatus | null>(null);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => {
    try {
      const [nextActivities, nextTags, nextPlans, nextGoals, nextWellness, nextStatus] = await Promise.all([
        api<Activity[]>('/activities'),
        api<Tag[]>('/tags'),
        api<Plan[]>('/plans'),
        api<Goal[]>('/goals'),
        api<Wellness[]>('/wellness'),
        api<StravaStatus>('/strava/status'),
      ]);
      setActivities(nextActivities);
      setTags(nextTags);
      setPlans(nextPlans);
      setGoals(nextGoals);
      setWellness(nextWellness);
      setStatus(nextStatus);
      setRevision(value => value + 1);
    } catch (error) {
      setNotice(String(error));
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const syncStrava = async () => {
    setBusy(true);
    try {
      const result = await api<Record<string, number>>('/strava/sync', { method: 'POST' });
      setNotice(`Synchronisation terminée : ${JSON.stringify(result)}`);
      await refresh();
    } catch (error) {
      setNotice(`Synchronisation : ${String(error)}`);
    } finally {
      setBusy(false);
    }
  };

  const importFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      const form = new FormData();
      Array.from(files).forEach(file => form.append('files', file));
      const report = await api<ImportReport>('/import', { method: 'POST', body: form });
      setNotice(report.files.map(file =>
        `${file.file} : ${file.status}${file.reason ? ` — ${file.reason}` : ''}`
      ).join('\n'));
      await refresh();
    } catch (error) {
      setNotice(String(error));
    } finally {
      setBusy(false);
    }
  };

  return {
    activities, tags, plans, goals, wellness, status, revision,
    busy, notice, setNotice, refresh, syncStrava, importFiles,
  };
}
