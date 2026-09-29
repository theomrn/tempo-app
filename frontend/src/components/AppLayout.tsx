import type { ReactNode } from 'react';
import { Activity, CalendarDays, Home, Medal, Settings2, TrendingUp, X } from 'lucide-react';
import { dateFR } from '../format';
import type { Page } from '../types';

const NAV_ITEMS = [
  { page: 'accueil', icon: Home, label: 'Vue d’ensemble', mobile: 'Accueil' },
  { page: 'activités', icon: Activity, label: 'Activités', mobile: 'Activités' },
  { page: 'tendances', icon: TrendingUp, label: 'Tendances', mobile: 'Tendances' },
  { page: 'calendrier', icon: CalendarDays, label: 'Calendrier', mobile: 'Planning' },
  { page: 'records', icon: Medal, label: 'Records', mobile: 'Records' },
  { page: 'réglages', icon: Settings2, label: 'Paramètres', mobile: 'Réglages' },
] as const;

export function AppLayout({ page, navigate, notice, clearNotice, children }: {
  page: Page;
  navigate: (page: Page) => void;
  notice: string;
  clearNotice: () => void;
  children: ReactNode;
}) {
  return <div className="app">
    <aside className="sidebar">
      <div className="brand"><span className="brandmark">T</span><span>TEMPO<small>MON CARNET SPORTIF</small></span></div>
      <nav>{NAV_ITEMS.map(({ page: itemPage, icon: Icon, label }) =>
        <button key={itemPage} className={page === itemPage ? 'active' : ''} onClick={() => navigate(itemPage)}>
          <Icon size={19} />{label}
        </button>
      )}</nav>
      <div className="sidebar-foot"><span className="status-dot" /> Données enregistrées localement</div>
    </aside>
    <main>
      <header className="topbar">
        <div className="crumb">CARNET PERSONNEL <span>/</span> {page.toUpperCase()}</div>
        <div className="top-actions">
          <span className="today">{dateFR(new Date().toISOString())}</span>
          <button className="icon-btn" title="Paramètres" onClick={() => navigate('réglages')}><Settings2 size={18} /></button>
        </div>
      </header>
      {notice && <div className="notice" role="status"><span>{notice}</span>
        <button onClick={clearNotice} aria-label="Fermer"><X size={16} /></button>
      </div>}
      {children}
    </main>
    <nav className="mobile-nav">{NAV_ITEMS.map(({ page: itemPage, icon: Icon, mobile }) =>
      <button key={itemPage} onClick={() => navigate(itemPage)} className={page === itemPage ? 'active' : ''}>
        <Icon size={20} /><span>{mobile}</span>
      </button>
    )}</nav>
  </div>;
}
