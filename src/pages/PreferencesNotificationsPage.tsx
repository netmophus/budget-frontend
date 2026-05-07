/**
 * PreferencesNotificationsPage (Lot 4.3) — page utilisateur courant
 * pour gérer les préférences d'envoi d'emails.
 *
 * - Toggle global : `notificationsEmailActives`
 * - Si actif : multi-select des types d'événements souhaités
 *   (default tous cochés → API reçoit NULL)
 */
import { Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  EVENEMENT_LABEL,
  type PreferencesNotifications,
  TYPES_EVENEMENT,
  type TypeEvenement,
  lireMesPreferences,
  mettreAJourMesPreferences,
} from '@/lib/api/notifications';

export function PreferencesNotificationsPage(): JSX.Element {
  const [prefs, setPrefs] = useState<PreferencesNotifications | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    lireMesPreferences()
      .then((p) => setPrefs(p))
      .catch(() => toast.error('Impossible de charger vos préférences.'))
      .finally(() => setLoading(false));
  }, []);

  function toggleGlobal(): void {
    if (!prefs) return;
    setPrefs({
      ...prefs,
      notificationsEmailActives: !prefs.notificationsEmailActives,
    });
  }

  function toggleType(e: TypeEvenement): void {
    if (!prefs) return;
    // Si NULL = tous cochés. On matérialise la liste pour pouvoir
    // décocher.
    const types = prefs.notificationsEmailTypes ?? [...TYPES_EVENEMENT];
    const newTypes = types.includes(e)
      ? types.filter((x) => x !== e)
      : [...types, e];
    // Si la liste matérialisée == TOUS, on remet NULL pour le backend.
    const tousCoches =
      newTypes.length === TYPES_EVENEMENT.length &&
      TYPES_EVENEMENT.every((t) => newTypes.includes(t));
    setPrefs({
      ...prefs,
      notificationsEmailTypes: tousCoches ? null : newTypes,
    });
  }

  function estCoche(e: TypeEvenement): boolean {
    if (!prefs) return false;
    if (prefs.notificationsEmailTypes === null) return true; // tous = NULL
    return prefs.notificationsEmailTypes.includes(e);
  }

  async function handleSave(): Promise<void> {
    if (!prefs) return;
    setSubmitting(true);
    try {
      const r = await mettreAJourMesPreferences(prefs);
      setPrefs(r);
      toast.success('Préférences enregistrées.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur';
      toast.error(`Échec : ${msg}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !prefs) {
    return (
      <div>
        <PageHeader title="Mes préférences" />
        <p className="text-sm text-(--muted-foreground)">Chargement…</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Mes préférences de notifications"
        description="Choisissez quelles notifications email vous souhaitez recevoir."
      />

      <div className="max-w-2xl space-y-5">
        <div className="rounded-md border border-(--border) p-4">
          <label className="flex items-center justify-between">
            <div>
              <div className="font-medium">
                Recevoir les notifications par email
              </div>
              <div className="text-xs text-(--muted-foreground) mt-1">
                Si désactivé, aucune notification ne vous sera envoyée. Une
                trace reste conservée côté admin pour auditabilité.
              </div>
            </div>
            <input
              type="checkbox"
              data-testid="toggle-global"
              checked={prefs.notificationsEmailActives}
              onChange={toggleGlobal}
              className="h-5 w-5"
            />
          </label>
        </div>

        {prefs.notificationsEmailActives && (
          <div className="rounded-md border border-(--border) p-4">
            <Label className="mb-3 block">Événements souhaités</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TYPES_EVENEMENT.map((e) => (
                <label
                  key={e}
                  className="flex items-center gap-2 text-sm"
                  data-testid={`type-${e}`}
                >
                  <input
                    type="checkbox"
                    checked={estCoche(e)}
                    onChange={() => toggleType(e)}
                  />
                  <span>{EVENEMENT_LABEL[e]}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-(--muted-foreground) mt-3">
              Astuce : laisser tous les types cochés revient à accepter toutes
              les notifications futures (défaut système).
            </p>
          </div>
        )}

        <Button
          onClick={handleSave}
          disabled={submitting}
          data-testid="btn-save-preferences"
        >
          <Save className="h-4 w-4" />
          {submitting ? 'Enregistrement…' : 'Enregistrer mes préférences'}
        </Button>
      </div>
    </div>
  );
}
