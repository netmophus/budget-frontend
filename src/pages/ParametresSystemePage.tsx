/**
 * ParametresSystemePage (Palier 1) — écran admin de paramétrage global.
 *
 * Pour l'instant : un seul paramètre, le mode de saisie du réalisé
 * (CENTRALISE / DECENTRALISE / MIXTE). Lecture pour CONFIGURATION.LIRE,
 * modification réservée à CONFIGURATION.GERER avec confirmation explicite
 * (action structurante).
 */
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getModeSaisieRealise,
  MODE_SAISIE_REALISE_DESCRIPTION,
  MODE_SAISIE_REALISE_LABEL,
  MODES_SAISIE_REALISE,
  setModeSaisieRealise,
  type ModeSaisieRealise,
} from '@/lib/api/realise-config';
import { useHasPermission } from '@/lib/auth/permissions';

export function ParametresSystemePage(): JSX.Element {
  const canGerer = useHasPermission('CONFIGURATION.GERER');

  const [mode, setMode] = useState<ModeSaisieRealise | null>(null);
  const [choix, setChoix] = useState<ModeSaisieRealise | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    setLoading(true);
    getModeSaisieRealise()
      .then((m) => {
        setMode(m);
        setChoix(m);
      })
      .catch(() => toast.error('Impossible de charger les paramètres système.'))
      .finally(() => setLoading(false));
  }, []);

  const dirty = choix !== null && choix !== mode;

  async function handleConfirmer(): Promise<void> {
    if (!choix) return;
    setSaving(true);
    try {
      const nouveau = await setModeSaisieRealise(choix);
      setMode(nouveau);
      setChoix(nouveau);
      setConfirming(false);
      toast.success(
        `Mode de saisie du réalisé : ${MODE_SAISIE_REALISE_LABEL[nouveau]}.`,
      );
    } catch {
      toast.error('Échec de la modification du mode de saisie.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Paramètres système"
        description="Paramétrage global de l'application. Modification réservée au rôle CONFIGURATION.GERER."
      />

      <div
        className="rounded-md border border-(--border) p-4 max-w-2xl space-y-4"
        data-testid="param-mode-saisie-realise"
      >
        <div>
          <h3 className="text-sm font-semibold">Mode de saisie du réalisé</h3>
          <p className="text-xs text-(--muted-foreground)">
            Détermine qui alimente le réalisé budgétaire mensuel.
          </p>
        </div>

        {loading && (
          <p className="text-sm text-(--muted-foreground)">Chargement…</p>
        )}

        {!loading && mode && (
          <>
            <div className="text-sm">
              <span className="text-(--muted-foreground)">Mode actuel : </span>
              <span className="font-medium" data-testid="param-mode-current">
                {MODE_SAISIE_REALISE_LABEL[mode]}
              </span>
            </div>

            {canGerer ? (
              <div className="space-y-3">
                <div className="max-w-md">
                  <Select
                    value={choix ?? undefined}
                    onValueChange={(v) => {
                      setChoix(v as ModeSaisieRealise);
                      setConfirming(false);
                    }}
                    disabled={saving}
                  >
                    <SelectTrigger data-testid="param-mode-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MODES_SAISIE_REALISE.map((m) => (
                        <SelectItem key={m} value={m}>
                          {MODE_SAISIE_REALISE_LABEL[m]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {choix && (
                    <p className="mt-1 text-xs text-(--muted-foreground)">
                      {MODE_SAISIE_REALISE_DESCRIPTION[choix]}
                    </p>
                  )}
                </div>

                {!confirming && (
                  <Button
                    onClick={() => setConfirming(true)}
                    disabled={!dirty || saving}
                    data-testid="btn-enregistrer-mode"
                  >
                    Enregistrer
                  </Button>
                )}

                {confirming && choix && (
                  <div
                    className="rounded-md border p-3 text-sm space-y-3"
                    style={{
                      borderColor: '#B05D3F40',
                      backgroundColor: '#B05D3F0D',
                    }}
                    data-testid="param-mode-confirm"
                  >
                    <p>
                      Confirmer le passage en mode{' '}
                      <strong>{MODE_SAISIE_REALISE_LABEL[choix]}</strong> ? Cela
                      modifie qui peut saisir le réalisé pour tous les
                      utilisateurs.
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={handleConfirmer}
                        disabled={saving}
                        data-testid="btn-confirmer-mode"
                      >
                        {saving ? 'Enregistrement…' : 'Confirmer'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setConfirming(false)}
                        disabled={saving}
                        data-testid="btn-annuler-mode"
                      >
                        Annuler
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-(--muted-foreground)">
                Lecture seule — la permission CONFIGURATION.GERER est requise
                pour modifier ce paramètre.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
