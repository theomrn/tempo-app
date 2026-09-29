import { lazy, Suspense, useState } from 'react';
import { AppLayout } from './components/AppLayout';
import { useAppData } from './hooks/useAppData';
import type { Activity, Page } from './types';

const DashboardPage = lazy(() => import('./pages/DashboardPage').then(module => ({ default: module.DashboardPage })));
const ActivitiesPage = lazy(() => import('./pages/ActivitiesPage').then(module => ({ default: module.ActivitiesPage })));
const TrendsPage = lazy(() => import('./pages/TrendsPage').then(module => ({ default: module.TrendsPage })));
const CalendarPage = lazy(() => import('./pages/CalendarPage').then(module => ({ default: module.CalendarPage })));
const RecordsPage = lazy(() => import('./pages/RecordsPage').then(module => ({ default: module.RecordsPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(module => ({ default: module.SettingsPage })));

export default function App() {
  const data = useAppData();
  const [page, setPage] = useState<Page>('accueil');
  const [period, setPeriod] = useState('3m');
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [calendarDay, setCalendarDay] = useState<string | null>(null);

  function navigate(destination: Page) {
    setPage(destination);
    setSelectedActivity(null);
    if (destination !== 'calendrier') setCalendarDay(null);
    window.scrollTo(0, 0);
  }

  function selectActivity(activity: Activity) {
    navigate('activités');
    setSelectedActivity(activity);
  }

  function openCalendarDay(date: string) {
    setCalendarDay(date);
    navigate('calendrier');
  }

  const currentPage = (() => {
    switch (page) {
      case 'accueil':
        return <DashboardPage
          activities={data.activities} plans={data.plans} status={data.status}
          busy={data.busy} period={period} revision={data.revision}
          onPeriodChange={setPeriod} onNavigate={navigate} onOpenDay={openCalendarDay}
          onSelectActivity={selectActivity} onSync={() => void data.syncStrava()}
          onError={data.setNotice}
        />;
      case 'activités':
        return <ActivitiesPage
          activities={data.activities} tags={data.tags} selected={selectedActivity}
          onSelect={setSelectedActivity} onRefresh={data.refresh} onError={data.setNotice}
        />;
      case 'tendances':
        return <TrendsPage
          activities={data.activities} tags={data.tags} period={period} revision={data.revision}
          onPeriodChange={setPeriod} onSelectActivity={selectActivity} onError={data.setNotice}
        />;
      case 'calendrier':
        return <CalendarPage
          activities={data.activities} plans={data.plans} goals={data.goals}
          wellness={data.wellness} tags={data.tags} initialDay={calendarDay}
          refresh={data.refresh} onSelectActivity={selectActivity} onError={data.setNotice}
        />;
      case 'records':
        return <RecordsPage revision={data.revision} onSelectActivity={selectActivity} onError={data.setNotice} />;
      case 'réglages':
        return <SettingsPage
          tags={data.tags} status={data.status} busy={data.busy}
          onSync={() => void data.syncStrava()} onImport={files => void data.importFiles(files)}
          refresh={data.refresh} onError={data.setNotice}
        />;
    }
  })();

  return <AppLayout page={page} navigate={navigate} notice={data.notice}
    clearNotice={() => data.setNotice('')}>
    <Suspense fallback={<div className="empty">Chargement de la page…</div>}>
      {currentPage}
    </Suspense>
  </AppLayout>;
}
