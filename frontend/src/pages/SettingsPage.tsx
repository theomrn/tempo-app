import { CloudUpload } from 'lucide-react';
import { api, json } from '../api';
import { dateFR } from '../format';
import type { StravaStatus, Tag } from '../types';
import { PageTitle } from '../components/Common';

export function SettingsPage({ tags, status, busy, onSync, onImport, refresh, onError }: {
  tags: Tag[];
  status: StravaStatus | null;
  busy: boolean;
  onSync: () => void;
  onImport: (files: FileList | null) => void;
  refresh: () => Promise<void>;
  onError: (message: string) => void;
}) {
  async function addTag() {
    const name = prompt('Nom de l’étiquette');
    if (!name) return;
    try {
      await api('/tags', json('POST', { name, color: '#7359e8' }));
      await refresh();
    } catch (error) { onError(String(error)); }
  }

  async function updateTag(tag: Tag, name: string, color = tag.color) {
    try {
      await api(`/tags/${tag.id}`, json('PATCH', { name, color }));
      await refresh();
    } catch (error) { onError(String(error)); }
  }

  async function removeTag(tag: Tag) {
    if (!confirm('Supprimer cette étiquette ? Les activités resteront intactes.')) return;
    try {
      await api(`/tags/${tag.id}`, { method: 'DELETE' });
      await refresh();
    } catch (error) { onError(String(error)); }
  }

  return <>
    <PageTitle kicker="CONFIGURATION" title="Paramètres" subtitle="Sources de données et organisation de votre carnet." />
    <div className="two-col">
      <div className="panel settings-panel">
        <span className="eyebrow">SOURCE D’ACTIVITÉS</span>
        <h3>Importer des fichiers FIT</h3>
        <p>Choisissez des fichiers FIT individuels ou une archive ZIP Garmin. Les doublons sont ignorés.</p>
        <label className="upload"><CloudUpload size={24} /><span>Choisir des fichiers FIT ou ZIP</span>
          <input type="file" multiple accept=".fit,.zip" onChange={event => onImport(event.target.files)} />
        </label>
      </div>
      <div className="panel settings-panel">
        <span className="eyebrow">CONNEXION</span><h3>Strava</h3>
        <p>{status?.connected ? 'Compte connecté' : 'Compte non connecté'}.{' '}
          {status?.last_sync ? `Dernière synchronisation : ${dateFR(status.last_sync)}` : 'Aucune synchronisation.'}
        </p>
        <p className="muted">{status?.last_result}</p>
        <div className="button-row">
          {status?.configured && <a className="outline" href="/api/strava/connect">{status.connected ? 'Reconnecter' : 'Connecter Strava'}</a>}
          <button className="primary" disabled={!status?.connected || busy} onClick={onSync}>Synchroniser</button>
        </div>
        {!status?.configured && <p className="muted">Ajoutez vos identifiants OAuth dans le fichier .env local.</p>}
      </div>
    </div>
    <div className="panel settings-panel">
      <div className="panel-head"><div><span className="eyebrow">ORGANISATION</span><h3>Étiquettes</h3></div>
        <button className="text-button" onClick={() => void addTag()}>+ Ajouter</button>
      </div>
      <div className="tag-list">{tags.map(tag => <div className="tag-setting" key={tag.id}>
        <span className="tag" style={{ background: `${tag.color}22`, color: tag.color }}>{tag.name}</span>
        <button onClick={() => {
          const name = prompt('Nouveau nom', tag.name);
          if (name) void updateTag(tag, name);
        }}>Renommer</button>
        <input type="color" aria-label={`Couleur ${tag.name}`} value={tag.color}
          onChange={event => void updateTag(tag, tag.name, event.target.value)} />
        <button onClick={() => void removeTag(tag)}>Supprimer</button>
      </div>)}</div>
    </div>
    <div className="coverage">Les activités Strava enregistrées sont incluses dans les statistiques et les tendances. Les records de course nécessitent des points horodatés ; les résumés seuls ne suffisent pas.</div>
  </>;
}
