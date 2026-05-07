/**
 * AdminEmailLogPage (Lot 4.3) — journal des emails envoyés / supprimés
 * / en échec, avec filtres par statut/événement et action de rejeu
 * sur les lignes en ECHEC.
 */
import { RefreshCcw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  type EmailLog,
  EVENEMENT_LABEL,
  type StatutEmail,
  STATUT_LABEL,
  STATUTS_EMAIL,
  type TypeEvenement,
  TYPES_EVENEMENT,
  listerEmailLog,
  rejouerEmail,
} from '@/lib/api/notifications';

function classeStatut(s: StatutEmail): string {
  if (s === 'ENVOYE') return 'bg-green-100 text-green-800';
  if (s === 'ECHEC') return 'bg-red-100 text-red-800';
  if (s === 'SUPPRIME') return 'bg-(--muted) text-(--muted-foreground)';
  return 'bg-amber-100 text-amber-800';
}

export function AdminEmailLogPage(): JSX.Element {
  const [items, setItems] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [statutsFilter, setStatutsFilter] = useState<StatutEmail[]>([]);
  const [evenementsFilter, setEvenementsFilter] = useState<TypeEvenement[]>([]);
  const [rechercheEmail, setRechercheEmail] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    listerEmailLog({
      statuts: statutsFilter.length > 0 ? statutsFilter : undefined,
      evenements: evenementsFilter.length > 0 ? evenementsFilter : undefined,
      rechercheEmail: rechercheEmail || undefined,
      limit: 100,
    })
      .then((r) => setItems(r.items))
      .catch(() => toast.error('Impossible de charger le journal des emails.'))
      .finally(() => setLoading(false));
  }, [refreshKey, statutsFilter, evenementsFilter, rechercheEmail]);

  function toggleStatut(s: StatutEmail): void {
    setStatutsFilter((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  }
  function toggleEvenement(e: TypeEvenement): void {
    setEvenementsFilter((prev) =>
      prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e],
    );
  }

  async function handleRejouer(id: string): Promise<void> {
    try {
      const r = await rejouerEmail(id);
      if (r.envoye) {
        toast.success('Email rejoué avec succès.');
      } else {
        toast.error('Le rejeu a échoué — voir le journal.');
      }
      setRefreshKey((k) => k + 1);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur';
      toast.error(`Rejeu refusé : ${msg}`);
    }
  }

  return (
    <div>
      <PageHeader
        title="Journal des emails"
        description="Trace de toutes les notifications envoyées (ou supprimées). Action de rejeu disponible sur les échecs."
      />

      {/* Filtres */}
      <div className="rounded-md border border-(--border) p-3 mb-4 space-y-3">
        <div>
          <Label className="text-xs uppercase text-(--muted-foreground)">
            Statut
          </Label>
          <div className="flex flex-wrap gap-2 mt-1">
            {STATUTS_EMAIL.map((s) => (
              <label
                key={s}
                className="flex items-center gap-1 text-sm"
                data-testid={`filtre-statut-${s}`}
              >
                <input
                  type="checkbox"
                  checked={statutsFilter.includes(s)}
                  onChange={() => toggleStatut(s)}
                />
                {STATUT_LABEL[s]}
              </label>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-xs uppercase text-(--muted-foreground)">
            Événement
          </Label>
          <div className="flex flex-wrap gap-2 mt-1">
            {TYPES_EVENEMENT.map((e) => (
              <label
                key={e}
                className="flex items-center gap-1 text-sm"
                data-testid={`filtre-event-${e}`}
              >
                <input
                  type="checkbox"
                  checked={evenementsFilter.includes(e)}
                  onChange={() => toggleEvenement(e)}
                />
                {EVENEMENT_LABEL[e]}
              </label>
            ))}
          </div>
        </div>
        <div>
          <Label
            htmlFor="recherche-email"
            className="text-xs uppercase text-(--muted-foreground)"
          >
            Recherche email destinataire
          </Label>
          <Input
            id="recherche-email"
            data-testid="recherche-email"
            value={rechercheEmail}
            onChange={(e) => setRechercheEmail(e.target.value)}
            placeholder="ex : @miznas.local"
            className="mt-1 max-w-sm"
          />
        </div>
      </div>

      {/* Tableau */}
      {loading && <p className="text-sm text-(--muted-foreground)">Chargement…</p>}
      {!loading && items.length === 0 && (
        <p
          className="text-sm text-(--muted-foreground)"
          data-testid="empty-state"
        >
          Aucun email enregistré.
        </p>
      )}
      <table className="w-full text-sm">
        <thead className="text-xs text-(--muted-foreground) border-b border-(--border)">
          <tr>
            <th className="text-left p-2">Date</th>
            <th className="text-left p-2">Événement</th>
            <th className="text-left p-2">Destinataire</th>
            <th className="text-left p-2">Sujet</th>
            <th className="text-left p-2">Statut</th>
            <th className="text-left p-2">Tent.</th>
            <th className="text-left p-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {items.map((l) => (
            <tr
              key={l.id}
              className="border-b border-(--border)/50"
              data-testid={`email-log-row-${l.id}`}
            >
              <td className="p-2 text-xs whitespace-nowrap">
                {l.dateCreation.slice(0, 16).replace('T', ' ')}
              </td>
              <td className="p-2 text-xs">{EVENEMENT_LABEL[l.evenement]}</td>
              <td className="p-2 text-xs">{l.destinataireEmail}</td>
              <td className="p-2 text-xs max-w-md truncate" title={l.sujet}>
                {l.sujet}
              </td>
              <td className="p-2">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${classeStatut(
                    l.statut,
                  )}`}
                  data-testid={`statut-badge-${l.id}`}
                >
                  {STATUT_LABEL[l.statut]}
                </span>
              </td>
              <td className="p-2 text-xs">{l.tentatives}</td>
              <td className="p-2">
                {l.statut === 'ECHEC' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRejouer(l.id)}
                    data-testid={`btn-rejouer-${l.id}`}
                  >
                    <RefreshCcw className="h-3 w-3" />
                    Rejouer
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
