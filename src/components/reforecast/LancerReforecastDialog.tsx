/**
 * Dialogue de lancement reforecast (Lot 5.3.B + refonte Lot 7.3
 * V25.1 Charte v1).
 *
 * - Sélecteurs version/scénario/trimestre/année/méthode/libellé
 * - Pré-remplissage automatique du libellé selon trimestre+année
 * - Vérification existence d'un reforecast pour la même clé →
 *   avertissement OBSOLETE + checkbox de confirmation
 * - Sur succès : redirection vers /reforecast/:id
 *
 * Refonte V25.1 (fix footer non visible) :
 *  - Pattern modale unifié V11→V19 : DialogContent !p-0 + flex
 *    flex-col + max-h-[90vh] ; header gradient bleu nuit shrink-0 ;
 *    body px-6 py-5 overflow-y-auto flex-1 ; footer border-t bg
 *    --secondary shrink-0
 *  - Trimestre rendu en 4 tiles façon Charte v1 (catégorie REALISE
 *    violet) avec libellés mensuels (Jan-Mars / Avr-Juin / Juil-Sept
 *    / Oct-Déc)
 *  - Méthode rendue en RadioGroup vertical avec descriptions enrichies
 *    (3 options réelles backend : MOYENNE_TRIMESTRE / BUDGET_INITIAL
 *    / MANUELLE — note : le mandat parlait de MOYENNE_CONSOLIDEE et
 *    SAISIE_MANUELLE, on s'aligne sur les enums backend)
 *  - Bandeau warning OBSOLETE en ambre Charte v1 (border-l ambre +
 *    bg ambre transparent)
 *  - Tous les data-testid préservés strictement (rf-lancer-form /
 *    rf-l-version / rf-l-scenario / rf-l-trim-${n} / rf-l-annee /
 *    rf-l-methode / rf-l-methode-${m} / rf-l-libelle / rf-l-commentaire
 *    / rf-l-warning-obsolete / rf-l-confirm-ecrasement / rf-l-erreurs
 *    / rf-l-submit)
 *  - Checkbox confirmation : input type="checkbox" natif (le test
 *    `fireEvent.click(testId('rf-l-confirm-ecrasement'))` attend un
 *    élément clickable qui flip son état)
 */
import { AlertTriangle, RotateCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  type LancerReforecastPayload,
  type MethodeExtrapolation,
  type Reforecast,
  METHODE_DESCRIPTION,
  METHODE_LABEL,
  chercherReforecastExistant,
} from '@/lib/api/reforecast';
import { listScenarios, type Scenario } from '@/lib/api/scenarios';
import { listVersions, type Version } from '@/lib/api/versions';
import { useReforecastStore } from '@/lib/stores/reforecast-store';
import { cn } from '@/lib/utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const METHODES: MethodeExtrapolation[] = [
  'MOYENNE_TRIMESTRE',
  'BUDGET_INITIAL',
  'MANUELLE',
];

const TRIMESTRE_MOIS_LABEL: Record<number, string> = {
  1: 'Jan-Mars',
  2: 'Avr-Juin',
  3: 'Juil-Sept',
  4: 'Oct-Déc',
};

function libelleAutomatique(trimestre: number, annee: number): string {
  return `Reforecast T${trimestre} ${annee}`;
}

export function LancerReforecastDialog({
  isOpen,
  onClose,
}: Props): JSX.Element {
  const navigate = useNavigate();
  const lancer = useReforecastStore((s) => s.lancer);

  const [versions, setVersions] = useState<Version[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(false);

  const [fkVersionSource, setFkVersionSource] = useState<string>('');
  const [fkScenarioSource, setFkScenarioSource] = useState<string>('');
  const [trimestreConsolide, setTrimestreConsolide] = useState<number>(1);
  const [anneeConsolide, setAnneeConsolide] = useState<number>(
    new Date().getFullYear(),
  );
  const [methode, setMethode] = useState<MethodeExtrapolation>(
    'MOYENNE_TRIMESTRE',
  );
  const [libelle, setLibelle] = useState<string>('');
  const [libelleEdited, setLibelleEdited] = useState(false);
  const [commentaire, setCommentaire] = useState<string>('');

  const [existant, setExistant] = useState<Reforecast | null>(null);
  const [confirmationEcrasement, setConfirmationEcrasement] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Chargement des référentiels à l'ouverture
  useEffect(() => {
    if (!isOpen) return;
    setLoadingRefs(true);
    Promise.all([
      listVersions({ limit: 200 }),
      listScenarios({ limit: 200 }),
    ])
      .then(([v, s]) => {
        setVersions(v.items.filter((x) => x.statut === 'gele'));
        setScenarios(s.items);
        if (!fkVersionSource && v.items.length > 0) {
          const def = v.items.find((x) => x.statut === 'gele');
          if (def) {
            setFkVersionSource(def.id);
            setAnneeConsolide(def.exerciceFiscal);
          }
        }
        if (!fkScenarioSource && s.items.length > 0) {
          setFkScenarioSource(s.items[0]!.id);
        }
      })
      .catch(() =>
        toast.error('Impossible de charger les référentiels du formulaire.'),
      )
      .finally(() => setLoadingRefs(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!libelleEdited) {
      setLibelle(libelleAutomatique(trimestreConsolide, anneeConsolide));
    }
  }, [trimestreConsolide, anneeConsolide, libelleEdited]);

  useEffect(() => {
    if (!fkVersionSource || !fkScenarioSource || !isOpen) {
      setExistant(null);
      return;
    }
    let cancelled = false;
    chercherReforecastExistant(
      fkVersionSource,
      fkScenarioSource,
      trimestreConsolide,
      anneeConsolide,
    )
      .then((r) => {
        if (!cancelled) {
          setExistant(r);
          setConfirmationEcrasement(false);
        }
      })
      .catch(() => {
        if (!cancelled) setExistant(null);
      });
    return () => {
      cancelled = true;
    };
  }, [
    fkVersionSource,
    fkScenarioSource,
    trimestreConsolide,
    anneeConsolide,
    isOpen,
  ]);

  const erreurs = useMemo(() => {
    const e: string[] = [];
    if (!fkVersionSource) e.push('Version source obligatoire.');
    if (!fkScenarioSource) e.push('Scénario source obligatoire.');
    if (trimestreConsolide < 1 || trimestreConsolide > 4)
      e.push('Trimestre invalide.');
    if (
      anneeConsolide < 2020 ||
      anneeConsolide > new Date().getFullYear() + 5
    )
      e.push('Année invalide.');
    if (!libelle.trim()) e.push('Libellé obligatoire.');
    return e;
  }, [
    fkVersionSource,
    fkScenarioSource,
    trimestreConsolide,
    anneeConsolide,
    libelle,
  ]);

  const peutSubmitter =
    erreurs.length === 0 &&
    !submitting &&
    (!existant || confirmationEcrasement);

  async function handleSubmit(): Promise<void> {
    setSubmitting(true);
    const payload: LancerReforecastPayload = {
      fkVersionSource,
      fkScenarioSource,
      trimestreConsolide,
      anneeConsolide,
      methodeExtrapolation: methode,
      libelleNouveauVersion: libelle.trim(),
      ...(commentaire.trim() ? { commentaire: commentaire.trim() } : {}),
    };
    try {
      const r = await lancer(payload);
      toast.success(`Reforecast ${r.codeVersion} lancé avec succès.`);
      onClose();
      navigate(`/reforecast/${r.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur';
      toast.error(`Échec du lancement : ${msg}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && !submitting && onClose()}>
      <DialogContent
        className={
          '!p-0 gap-0 overflow-hidden !max-w-2xl max-h-[90vh] ' +
          'flex flex-col ' +
          '[&>button]:text-white [&>button]:opacity-80 [&>button]:hover:opacity-100'
        }
      >
        {/* ─── Header gradient bleu nuit ─────────────────────── */}
        <div
          className="px-6 py-5 text-white shrink-0"
          style={{
            background:
              'linear-gradient(135deg, var(--miznas-bleu-nuit-dark) 0%, var(--miznas-bleu-nuit-light) 100%)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-md flex items-center justify-center"
              style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
              aria-hidden="true"
            >
              <RotateCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-[19px] font-semibold tracking-tight m-0">
                Lancer un reforecast
              </h3>
              <p className="text-xs opacity-80 mt-0.5">
                Reprévision périodique après consolidation d&apos;un
                trimestre — la nouvelle version sera créée en BROUILLON.
              </p>
            </div>
          </div>
        </div>

        {/* ─── Body scrollable ───────────────────────────────── */}
        <div
          className="px-6 py-5 overflow-y-auto flex-1 space-y-4"
          data-testid="rf-lancer-form"
        >
          {/* Version source + Scénario source */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label
                htmlFor="rf-l-version"
                className="text-sm font-medium text-(--foreground)"
              >
                Version source (publiée){' '}
                <span className="text-red-500">*</span>
              </Label>
              <Select
                value={fkVersionSource}
                onValueChange={(v) => {
                  setFkVersionSource(v);
                  const ver = versions.find((x) => x.id === v);
                  if (ver) setAnneeConsolide(ver.exerciceFiscal);
                }}
                disabled={loadingRefs}
              >
                <SelectTrigger
                  id="rf-l-version"
                  data-testid="rf-l-version"
                  className="h-9"
                >
                  <SelectValue placeholder="Choisir…" />
                </SelectTrigger>
                <SelectContent>
                  {versions.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      <span className="font-mono text-xs">
                        {v.codeVersion}
                      </span>
                      {' — '}
                      <span>{v.libelle}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-(--muted-foreground)">
                Seules les versions publiées (statut « gele ») sont
                éligibles.
              </p>
            </div>

            <div className="space-y-1">
              <Label
                htmlFor="rf-l-scenario"
                className="text-sm font-medium text-(--foreground)"
              >
                Scénario source <span className="text-red-500">*</span>
              </Label>
              <Select
                value={fkScenarioSource}
                onValueChange={setFkScenarioSource}
                disabled={loadingRefs}
              >
                <SelectTrigger
                  id="rf-l-scenario"
                  data-testid="rf-l-scenario"
                  className="h-9"
                >
                  <SelectValue placeholder="Choisir…" />
                </SelectTrigger>
                <SelectContent>
                  {scenarios.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="font-mono text-xs">
                        {s.codeScenario}
                      </span>
                      {' — '}
                      <span>{s.libelle}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Trimestre tiles + Année consolidée */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_140px] gap-3">
            <div>
              <Label className="text-sm font-medium text-(--foreground)">
                Trimestre consolidé <span className="text-red-500">*</span>
              </Label>
              <div
                className="grid grid-cols-4 gap-1.5 mt-2"
                role="radiogroup"
                data-testid="rf-l-trimestre"
              >
                {[1, 2, 3, 4].map((t) => {
                  const selected = trimestreConsolide === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTrimestreConsolide(t)}
                      data-testid={`rf-l-trim-${t}`}
                      aria-pressed={selected}
                      className={cn(
                        'border rounded-md py-2.5 px-2 text-center transition-all cursor-pointer',
                        selected
                          ? 'border-2 shadow-sm'
                          : 'border-(--border) hover:border-(--muted-foreground)/40 bg-white',
                      )}
                      style={
                        selected
                          ? {
                              borderColor: '#5B4E91',
                              backgroundColor: '#5B4E910F',
                            }
                          : undefined
                      }
                    >
                      <div
                        className="font-mono text-[14px] font-semibold"
                        style={selected ? { color: '#5B4E91' } : undefined}
                      >
                        T{t}
                      </div>
                      <div className="text-[10px] text-(--muted-foreground) mt-0.5">
                        {TRIMESTRE_MOIS_LABEL[t]}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1">
              <Label
                htmlFor="rf-l-annee"
                className="text-sm font-medium text-(--foreground)"
              >
                Année <span className="text-red-500">*</span>
              </Label>
              <Input
                id="rf-l-annee"
                data-testid="rf-l-annee"
                type="number"
                min="2020"
                max={String(new Date().getFullYear() + 5)}
                value={anneeConsolide}
                onChange={(e) => setAnneeConsolide(Number(e.target.value))}
                className="h-9 tabular-nums"
              />
            </div>
          </div>

          {/* Méthode d'extrapolation — radio vertical avec descriptions */}
          <div>
            <Label className="text-sm font-medium text-(--foreground)">
              Méthode d&apos;extrapolation{' '}
              <span className="text-red-500">*</span>
            </Label>
            <div
              className="space-y-1.5 mt-2"
              role="radiogroup"
              data-testid="rf-l-methode"
            >
              {METHODES.map((m) => {
                const selected = methode === m;
                return (
                  <label
                    key={m}
                    className={cn(
                      'flex items-start gap-3 border rounded-md p-3 cursor-pointer transition-colors',
                      selected
                        ? 'border-2'
                        : 'border-(--border) hover:bg-(--muted)/30',
                    )}
                    style={
                      selected
                        ? {
                            borderColor: '#0C447C',
                            backgroundColor: '#0C447C0A',
                          }
                        : undefined
                    }
                  >
                    <input
                      type="radio"
                      name="rf-methode"
                      value={m}
                      checked={selected}
                      onChange={() => setMethode(m)}
                      data-testid={`rf-l-methode-${m}`}
                      className="mt-1 cursor-pointer accent-(--miznas-bleu-nuit-dark)"
                    />
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-[13px] font-semibold"
                        style={
                          selected ? { color: '#0C447C' } : undefined
                        }
                      >
                        {METHODE_LABEL[m]}
                      </div>
                      <div className="text-xs text-(--muted-foreground) mt-0.5 leading-relaxed">
                        {METHODE_DESCRIPTION[m]}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Libellé */}
          <div className="space-y-1">
            <Label
              htmlFor="rf-l-libelle"
              className="text-sm font-medium text-(--foreground)"
            >
              Libellé <span className="text-red-500">*</span>
            </Label>
            <Input
              id="rf-l-libelle"
              data-testid="rf-l-libelle"
              value={libelle}
              onChange={(e) => {
                setLibelle(e.target.value);
                setLibelleEdited(true);
              }}
              className="h-9"
            />
            <p className="text-xs text-(--muted-foreground)">
              Pré-rempli selon trimestre + année. Modifiable.
            </p>
          </div>

          {/* Commentaire */}
          <div className="space-y-1">
            <Label
              htmlFor="rf-l-commentaire"
              className="text-sm font-medium text-(--foreground)"
            >
              Commentaire (optionnel)
            </Label>
            <textarea
              id="rf-l-commentaire"
              data-testid="rf-l-commentaire"
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
              rows={2}
              className="flex w-full rounded-md border border-(--border) bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-(--ring) resize-y"
            />
          </div>

          {/* Bandeau warning OBSOLETE (ambre Charte v1) */}
          {existant && (
            <div
              className="rounded-sm px-4 py-3 flex items-start gap-3"
              style={{
                backgroundColor: '#BA75170F',
                borderLeft: '3px solid #BA7517',
              }}
              data-testid="rf-l-warning-obsolete"
            >
              <AlertTriangle
                className="w-4 h-4 shrink-0 mt-0.5"
                style={{ color: '#BA7517' }}
                aria-hidden="true"
              />
              <div className="flex-1 min-w-0">
                <div
                  className="text-[13px] font-semibold mb-1"
                  style={{ color: '#BA7517' }}
                >
                  Un reforecast existe déjà pour ces paramètres
                </div>
                <div className="text-xs text-(--foreground) mb-2 leading-relaxed">
                  <span className="font-semibold">{existant.libelle}</span>
                  {' ('}
                  <span className="font-mono text-[11px]">
                    {existant.codeVersion}
                  </span>
                  {') — statut : '}
                  <span className="font-medium">{existant.statut}</span>.
                </div>
                <div className="text-xs text-(--muted-foreground) mb-3 leading-relaxed">
                  Lancer un nouveau reforecast marquera l&apos;ancien
                  comme <strong>OBSOLETE</strong>. Cette action est tracée
                  en audit.
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmationEcrasement}
                    onChange={(e) =>
                      setConfirmationEcrasement(e.target.checked)
                    }
                    data-testid="rf-l-confirm-ecrasement"
                    className="h-4 w-4 rounded border border-(--border) accent-(--miznas-ambre) cursor-pointer"
                  />
                  <span className="text-[13px] font-medium">
                    Je comprends et confirme l&apos;écrasement
                  </span>
                </label>
              </div>
            </div>
          )}

          {erreurs.length > 0 && (
            <ul
              className="rounded-md border p-3 text-xs list-disc list-inside space-y-0.5"
              style={{
                borderColor: '#DC262640',
                backgroundColor: '#DC26260D',
                color: '#DC2626',
              }}
              data-testid="rf-l-erreurs"
            >
              {erreurs.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
        </div>

        {/* ─── Footer sticky ─────────────────────────────────── */}
        <div className="border-t border-(--border) px-6 py-3.5 flex justify-end gap-2.5 bg-(--secondary) shrink-0">
          <DialogClose asChild>
            <Button variant="outline" disabled={submitting}>
              Annuler
            </Button>
          </DialogClose>
          <Button
            onClick={() => void handleSubmit()}
            disabled={!peutSubmitter}
            data-testid="rf-l-submit"
            className="bg-(--miznas-bleu-nuit-dark) hover:bg-(--miznas-bleu-nuit-dark)/90 text-white gap-1.5"
          >
            <RotateCw
              className={cn('w-3.5 h-3.5', submitting && 'animate-spin')}
            />
            {submitting ? 'Génération en cours…' : 'Lancer le reforecast'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
