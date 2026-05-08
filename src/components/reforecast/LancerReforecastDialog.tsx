/**
 * Dialogue de lancement reforecast (Lot 5.3.B).
 *
 * - Sélecteurs version/scénario/trimestre/année/méthode/libellé
 * - Pré-remplissage automatique du libellé selon trimestre+année
 * - Vérification existence d'un reforecast pour la même clé →
 *   avertissement OBSOLETE + checkbox de confirmation
 * - Sur succès : redirection vers /reforecast/:id
 */
import { AlertTriangle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const METHODES: MethodeExtrapolation[] = [
  'MOYENNE_TRIMESTRE',
  'BUDGET_INITIAL',
  'MANUELLE',
];

function libelleAutomatique(trimestre: number, annee: number): string {
  return `Reforecast T${trimestre} ${annee}`;
}

export function LancerReforecastDialog({ isOpen, onClose }: Props): JSX.Element {
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
        // Versions PUBLIE (statut=gele) éligibles comme source
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

  // Pré-remplissage du libellé tant que l'utilisateur n'a pas édité
  useEffect(() => {
    if (!libelleEdited) {
      setLibelle(libelleAutomatique(trimestreConsolide, anneeConsolide));
    }
  }, [trimestreConsolide, anneeConsolide, libelleEdited]);

  // Vérifie l'existence d'un reforecast pour la même clé (avec debounce
  // implicite : on relance à chaque changement de paramètre).
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
        // En cas d'erreur, on ne bloque pas — l'avertissement sera
        // remonté à la soumission si nécessaire.
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
    if (anneeConsolide < 2020 || anneeConsolide > new Date().getFullYear() + 5)
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

  function trimestreLibelle(t: number, a: number): string {
    const debut = (t - 1) * 3 + 1;
    const fin = t * 3;
    const noms = [
      'Janvier',
      'Février',
      'Mars',
      'Avril',
      'Mai',
      'Juin',
      'Juillet',
      'Août',
      'Septembre',
      'Octobre',
      'Novembre',
      'Décembre',
    ];
    return `T${t} = ${noms[debut - 1]}-${noms[fin - 1]} ${a}`;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Lancer un reforecast trimestriel</DialogTitle>
          <DialogDescription>
            La nouvelle version sera créée en BROUILLON avec les lignes
            extrapolées selon la méthode choisie.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3" data-testid="rf-lancer-form">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="rf-l-version">Version source (publiée)</Label>
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
                >
                  <SelectValue placeholder="Choisir…" />
                </SelectTrigger>
                <SelectContent>
                  {versions.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.codeVersion} — {v.libelle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="rf-l-scenario">Scénario source</Label>
              <Select
                value={fkScenarioSource}
                onValueChange={setFkScenarioSource}
                disabled={loadingRefs}
              >
                <SelectTrigger
                  id="rf-l-scenario"
                  data-testid="rf-l-scenario"
                >
                  <SelectValue placeholder="Choisir…" />
                </SelectTrigger>
                <SelectContent>
                  {scenarios.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.codeScenario} — {s.libelle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>Trimestre consolidé</Label>
              <div
                className="flex gap-1 mt-1"
                role="radiogroup"
                data-testid="rf-l-trimestre"
              >
                {[1, 2, 3, 4].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTrimestreConsolide(t)}
                    className={`px-3 py-2 rounded text-sm border ${
                      trimestreConsolide === t
                        ? 'bg-(--primary) text-(--primary-foreground) border-(--primary)'
                        : 'bg-(--background) border-(--border) hover:bg-(--accent)/30'
                    }`}
                    data-testid={`rf-l-trim-${t}`}
                  >
                    T{t}
                  </button>
                ))}
              </div>
              <p className="text-xs text-(--muted-foreground) mt-1">
                {trimestreLibelle(trimestreConsolide, anneeConsolide)}
              </p>
            </div>

            <div>
              <Label htmlFor="rf-l-annee">Année consolidée</Label>
              <Input
                id="rf-l-annee"
                data-testid="rf-l-annee"
                type="number"
                min="2020"
                max={String(new Date().getFullYear() + 5)}
                value={anneeConsolide}
                onChange={(e) => setAnneeConsolide(Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <Label>Méthode d'extrapolation</Label>
            <div
              className="space-y-2 mt-1"
              role="radiogroup"
              data-testid="rf-l-methode"
            >
              {METHODES.map((m) => (
                <label
                  key={m}
                  className={`flex gap-2 p-2 rounded border cursor-pointer ${
                    methode === m
                      ? 'border-(--primary) bg-(--primary)/5'
                      : 'border-(--border)'
                  }`}
                >
                  <input
                    type="radio"
                    name="rf-methode"
                    value={m}
                    checked={methode === m}
                    onChange={() => setMethode(m)}
                    data-testid={`rf-l-methode-${m}`}
                    className="mt-0.5"
                  />
                  <span className="text-sm">
                    <strong>{METHODE_LABEL[m]}</strong>
                    <span className="block text-xs text-(--muted-foreground)">
                      {METHODE_DESCRIPTION[m]}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="rf-l-libelle">Libellé</Label>
            <Input
              id="rf-l-libelle"
              data-testid="rf-l-libelle"
              value={libelle}
              onChange={(e) => {
                setLibelle(e.target.value);
                setLibelleEdited(true);
              }}
            />
          </div>

          <div>
            <Label htmlFor="rf-l-commentaire">Commentaire (optionnel)</Label>
            <textarea
              id="rf-l-commentaire"
              data-testid="rf-l-commentaire"
              className="w-full rounded-md border border-(--border) bg-(--background) p-2 text-sm"
              rows={2}
              value={commentaire}
              onChange={(e) => setCommentaire(e.target.value)}
            />
          </div>

          {existant && (
            <div
              className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
              data-testid="rf-l-warning-obsolete"
            >
              <div className="flex gap-2 items-start">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">
                    Un reforecast existe déjà pour ces paramètres.
                  </p>
                  <p className="mt-1">
                    <strong>{existant.libelle}</strong> ({existant.codeVersion})
                    — statut : {existant.statut}.
                  </p>
                  <p className="mt-1">
                    Lancer un nouveau reforecast marquera l'ancien comme
                    OBSOLETE. Cette action est tracée en audit.
                  </p>
                  <label className="flex items-center gap-2 mt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmationEcrasement}
                      onChange={(e) =>
                        setConfirmationEcrasement(e.target.checked)
                      }
                      data-testid="rf-l-confirm-ecrasement"
                    />
                    <span>Je comprends et confirme l'écrasement</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {erreurs.length > 0 && (
            <ul
              className="text-xs text-red-500 list-disc list-inside"
              data-testid="rf-l-erreurs"
            >
              {erreurs.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={!peutSubmitter}
            data-testid="rf-l-submit"
          >
            {submitting ? 'Génération en cours…' : 'Lancer le reforecast'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
