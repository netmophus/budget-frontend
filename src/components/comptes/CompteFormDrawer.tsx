/**
 * CompteFormDrawer (Lot 2.5E + Lot 7.3 V12 refonte Charte v1).
 *
 * Modale de création / édition d'un compte PCB UMOA. Refondue V12
 * dans le pattern unifié des modales :
 *   - header gradient bleu nuit dark→light avec icône Calculator ambre
 *   - body scrollable flex-1 + footer sticky shrink-0
 *   - Niveau via 4 tiles (1/2/3/4) au lieu d'un input number
 *   - Sens via 3 tiles (D rouge / C vert / M gris) au lieu d'un Select
 *
 * Logique métier 100 % préservée :
 *   - useScd2EditDiff (bandeau jaune/bleu en mode édition)
 *   - parentsEligibles avec anti-cycle BFS (descendance exclue)
 *   - Filtrage parent : niveau strict < courant, classe identique,
 *     actif, courant, hors descendants
 *   - Validation côté client (codeValide, canSubmit)
 *   - 4 modes maj SCD2 (no_op / in_place_est_actif /
 *     ecrasement_intra_jour / nouvelle_version)
 *   - Code numérique uniquement, immuable en mode edit
 */
import { AxiosError } from 'axios';
import {
  AlertTriangle,
  Calculator,
  Check,
  Hash,
  Info,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { RefSecondaireSelect } from '@/components/common/RefSecondaireSelect';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
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
  type Compte,
  type CompteModeMaj,
  type CreateCompteDto,
  createCompte,
  listComptes,
  type SensCompte,
  type UpdateCompteDto,
  updateCompte,
} from '@/lib/api/referentiels';
import { useScd2EditDiff } from '@/lib/hooks/useScd2EditDiff';
import { cn } from '@/lib/utils';

const NONE = '__none__';
const NIVEAU_MAX = 4;

interface FormState extends Record<string, unknown> {
  codeCompte: string;
  libelle: string;
  classe: string;
  sousClasse: string;
  niveau: number;
  fkCompteParent: string;
  sens: string;
  codePosteBudgetaire: string;
  estCompteCollectif: boolean;
  estPorteurInterets: boolean;
  estActif: boolean;
}

const SCD2_FIELDS = [
  'libelle',
  'sousClasse',
  'fkCompteParent',
  'niveau',
  'sens',
  'codePosteBudgetaire',
  'estCompteCollectif',
  'estPorteurInterets',
] as const;

function initialFromCompte(c: Compte | null): FormState {
  if (!c) {
    return {
      codeCompte: '',
      libelle: '',
      classe: '',
      sousClasse: '',
      niveau: 1,
      fkCompteParent: '',
      sens: '',
      codePosteBudgetaire: '',
      estCompteCollectif: false,
      estPorteurInterets: false,
      estActif: true,
    };
  }
  return {
    codeCompte: c.codeCompte,
    libelle: c.libelle,
    classe: c.classe,
    sousClasse: c.sousClasse ?? '',
    niveau: c.niveau,
    fkCompteParent: c.fkCompteParent ?? '',
    sens: c.sens ?? '',
    codePosteBudgetaire: c.codePosteBudgetaire ?? '',
    estCompteCollectif: c.estCompteCollectif,
    estPorteurInterets: c.estPorteurInterets,
    estActif: c.estActif,
  };
}

function parseApiError(err: unknown): { status: number; message: string } {
  if (err instanceof AxiosError) {
    const status = err.response?.status ?? 0;
    const dataMsg =
      (err.response?.data as { message?: string | string[] } | undefined)
        ?.message;
    const message = Array.isArray(dataMsg)
      ? dataMsg.join(' ; ')
      : (dataMsg ?? err.message);
    return { status, message };
  }
  return { status: 0, message: err instanceof Error ? err.message : 'Erreur' };
}

interface CompteFormDrawerProps {
  mode: 'create' | 'edit';
  initial?: Compte | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (compte: Compte, modeMaj: CompteModeMaj | null) => void;
}

const MODE_MAJ_LIBELLES: Record<CompteModeMaj, string> = {
  no_op: 'Aucun changement détecté.',
  in_place_est_actif: 'Statut activé / désactivé.',
  ecrasement_intra_jour:
    'Modification appliquée (intra-jour, pas de nouvelle version).',
  nouvelle_version:
    "Nouvelle version SCD2 créée (l'ancienne est fermée).",
};

const SENS_TILES: Array<{ sens: SensCompte; label: string; hex: string }> = [
  { sens: 'D', label: 'Débit', hex: '#DC2626' }, // rouge destructive
  { sens: 'C', label: 'Crédit', hex: '#0F6E56' }, // vert validation
  { sens: 'M', label: 'Mixte', hex: '#5F6B7A' }, // gris ardoise
];

export function CompteFormDrawer({
  mode,
  initial,
  isOpen,
  onClose,
  onSuccess,
}: CompteFormDrawerProps) {
  const [form, setForm] = useState<FormState>(
    initialFromCompte(initial ?? null),
  );
  const [submitting, setSubmitting] = useState(false);
  const [allComptes, setAllComptes] = useState<Compte[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    listComptes({ versionCouranteUniquement: true, limit: 200 })
      .then((res) => setAllComptes(res.items))
      .catch(() =>
        toast.error('Impossible de charger les comptes parents'),
      );
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setForm(initialFromCompte(initial ?? null));
    }
  }, [isOpen, initial]);

  const idsExclus = useMemo(() => {
    if (mode !== 'edit' || !initial) return new Set<string>();
    const exclus = new Set<string>([initial.id]);
    let frontier = [initial.id];
    while (frontier.length > 0) {
      const next: string[] = [];
      for (const c of allComptes) {
        if (
          c.fkCompteParent !== null &&
          frontier.includes(c.fkCompteParent)
        ) {
          if (!exclus.has(c.id)) {
            exclus.add(c.id);
            next.push(c.id);
          }
        }
      }
      frontier = next;
    }
    return exclus;
  }, [allComptes, mode, initial]);

  const parentsEligibles = useMemo(() => {
    return allComptes.filter((c) => {
      if (idsExclus.has(c.id)) return false;
      if (c.niveau >= form.niveau) return false;
      if (!c.estActif) return false;
      if (form.classe && c.classe !== form.classe) return false;
      return true;
    });
  }, [allComptes, idsExclus, form.niveau, form.classe]);

  const codeValide =
    mode === 'edit' ? true : /^[0-9]{1,20}$/.test(form.codeCompte);
  const isRacine = form.niveau === 1;

  const canSubmit =
    !submitting &&
    form.libelle.trim() !== '' &&
    form.classe !== '' &&
    form.niveau >= 1 &&
    form.niveau <= NIVEAU_MAX &&
    codeValide &&
    (isRacine || form.fkCompteParent !== '');

  const editDiff = useScd2EditDiff<FormState>({
    initial: initialFromCompte(initial ?? null),
    form,
    scd2Fields: [...SCD2_FIELDS],
    dateDebutValiditeInitiale: initial?.dateDebutValidite,
  });
  const bandeau = mode === 'edit' && initial ? editDiff.bandeau : null;

  async function onSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      if (mode === 'create') {
        const dto: CreateCompteDto = {
          codeCompte: form.codeCompte,
          libelle: form.libelle,
          classe: form.classe,
          niveau: form.niveau,
          ...(form.sousClasse ? { sousClasse: form.sousClasse } : {}),
          ...(form.fkCompteParent
            ? { fkCompteParent: form.fkCompteParent }
            : {}),
          ...(form.sens ? { sens: form.sens as SensCompte } : {}),
          ...(form.codePosteBudgetaire
            ? { codePosteBudgetaire: form.codePosteBudgetaire }
            : {}),
          estCompteCollectif: form.estCompteCollectif,
          estPorteurInterets: form.estPorteurInterets,
        };
        const created = await createCompte(dto);
        onSuccess(created, null);
        return;
      }
      if (!initial) return;
      const dto: UpdateCompteDto = { ...(editDiff.diff as UpdateCompteDto) };
      if (
        'fkCompteParent' in dto &&
        (dto.fkCompteParent as string) === ''
      ) {
        dto.fkCompteParent = null;
      }
      if ('sens' in dto && (dto.sens as string) === '') {
        delete dto.sens;
      }
      const updated = await updateCompte(initial.codeCompte, dto);
      onSuccess(updated, updated.modeMaj ?? null);
      if (updated.modeMaj && updated.modeMaj !== 'no_op') {
        toast.success(MODE_MAJ_LIBELLES[updated.modeMaj]);
      } else if (updated.modeMaj === 'no_op') {
        toast.info(MODE_MAJ_LIBELLES.no_op);
      }
    } catch (err) {
      const { status, message } = parseApiError(err);
      if (status === 409) {
        if (mode === 'create') {
          toast.error(`Le code '${form.codeCompte}' existe déjà.`);
        } else {
          toast.error(message);
        }
      } else if (status === 422 || status === 400) {
        toast.error(message);
      } else {
        toast.error(message || "Échec de l'enregistrement.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const titre = mode === 'create' ? 'Nouveau compte' : 'Modifier le compte';
  const sousTitre =
    mode === 'create'
      ? 'Renseignez les informations pour créer un compte PCB UMOA.'
      : `Code business : ${initial?.codeCompte ?? ''}`;

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && !submitting && onClose()}>
      <DialogContent
        className={
          '!p-0 gap-0 overflow-hidden !max-w-2xl max-h-[90vh] ' +
          'flex flex-col ' +
          '[&>button]:text-white [&>button]:opacity-80 [&>button]:hover:opacity-100'
        }
      >
        {/* Header gradient (shrink-0) */}
        <div
          className="px-7 py-5 text-white shrink-0"
          style={{
            background:
              'linear-gradient(135deg, var(--miznas-bleu-nuit-dark) 0%, var(--miznas-bleu-nuit-light) 100%)',
          }}
          data-testid="compte-form-header"
        >
          <div className="flex items-start gap-2.5">
            <Calculator
              className="w-4 h-4 mt-1 text-(--miznas-ambre) shrink-0"
              aria-hidden="true"
            />
            <div className="flex-1">
              <DialogTitle className="text-base font-semibold leading-tight">
                {titre}
              </DialogTitle>
              <p className="text-xs text-white/95 mt-1.5">{sousTitre}</p>
            </div>
          </div>
        </div>

        {/* Body scrollable (flex-1) */}
        <div className="px-7 py-5 overflow-y-auto flex-1">
          {bandeau && (
            <div
              className={cn(
                'rounded-md border p-3 text-sm space-y-1 mb-4',
                bandeau.type === 'jaune'
                  ? 'border-yellow-300 bg-yellow-50'
                  : bandeau.type === 'bleu'
                    ? 'border-blue-300 bg-blue-50'
                    : 'border-sky-300 bg-sky-50',
              )}
              data-testid="compte-form-bandeau-scd2"
            >
              <div className="flex items-center gap-2 font-semibold">
                {bandeau.type === 'jaune' ? (
                  <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Info className="h-4 w-4" aria-hidden="true" />
                )}
                {bandeau.titre}
              </div>
              <p>{bandeau.message}</p>
            </div>
          )}

          {/* Code + Classe */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div>
              <Label
                htmlFor="codeCompte"
                className="text-sm font-medium text-(--foreground)"
              >
                Code compte <span className="text-(--destructive)">*</span>
              </Label>
              <div className="relative mt-1.5">
                <Hash
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-(--muted-foreground) pointer-events-none"
                  aria-hidden="true"
                />
                <Input
                  id="codeCompte"
                  value={form.codeCompte}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      codeCompte: e.target.value.replace(/[^0-9]/g, ''),
                    })
                  }
                  placeholder="ex. 601100"
                  disabled={mode === 'edit' || submitting}
                  maxLength={20}
                  className="pl-9 h-9 font-mono"
                />
              </div>
              <p className="text-xs text-(--muted-foreground)/70 mt-1.5">
                {mode === 'edit'
                  ? 'Le code business est immuable.'
                  : 'Numérique uniquement, max 20 caractères.'}
                {mode === 'create' &&
                  form.codeCompte !== '' &&
                  !codeValide && (
                    <span className="block text-(--destructive) mt-1">
                      ⚠ Format invalide.
                    </span>
                  )}
              </p>
            </div>

            <div>
              <Label
                htmlFor="classe"
                className="text-sm font-medium text-(--foreground)"
              >
                Classe <span className="text-(--destructive)">*</span>
              </Label>
              <div className="mt-1.5">
                <RefSecondaireSelect
                  id="classe"
                  refKey="classe-compte"
                  value={form.classe}
                  onValueChange={(v) => setForm({ ...form, classe: v })}
                  disabled={mode === 'edit' || submitting}
                  labelChamp="les classes PCB"
                />
              </div>
              <p className="text-xs text-(--muted-foreground)/70 mt-1.5">
                {mode === 'edit'
                  ? 'La classe est immuable.'
                  : 'PCB UMOA Révisé — classes 1 à 9.'}
              </p>
            </div>
          </div>

          {/* Libellé */}
          <div className="mb-4">
            <Label
              htmlFor="libelle"
              className="text-sm font-medium text-(--foreground)"
            >
              Libellé <span className="text-(--destructive)">*</span>
            </Label>
            <Input
              id="libelle"
              value={form.libelle}
              onChange={(e) => setForm({ ...form, libelle: e.target.value })}
              placeholder="ex. Fournitures de bureau"
              disabled={submitting}
              maxLength={200}
              className="h-9 mt-1.5"
            />
          </div>

          {/* Sous-classe + Niveau */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div>
              <Label
                htmlFor="sousClasse"
                className="text-sm font-medium text-(--foreground)"
              >
                Sous-classe
              </Label>
              <Input
                id="sousClasse"
                value={form.sousClasse}
                onChange={(e) =>
                  setForm({ ...form, sousClasse: e.target.value })
                }
                placeholder="ex. 60"
                disabled={submitting}
                maxLength={20}
                className="h-9 mt-1.5"
              />
              <p className="text-xs text-(--muted-foreground)/70 mt-1.5">
                Optionnel — groupement pédagogique.
              </p>
            </div>

            <div>
              <Label
                htmlFor="niveau"
                className="text-sm font-medium text-(--foreground)"
              >
                Niveau <span className="text-(--destructive)">*</span>
              </Label>
              <div
                className="grid grid-cols-4 gap-2 mt-1.5"
                role="radiogroup"
                aria-label="Niveau"
              >
                {[1, 2, 3, 4].map((n) => (
                  <NiveauTile
                    key={n}
                    n={n as 1 | 2 | 3 | 4}
                    selected={form.niveau === n}
                    onSelect={() => setForm({ ...form, niveau: n })}
                    disabled={submitting}
                  />
                ))}
                {/* Champ caché pour préserver l'aria-label "Niveau" et
                    l'id "niveau" pour les tests qui font getByLabelText. */}
                <input
                  id="niveau"
                  type="hidden"
                  value={form.niveau}
                  readOnly
                  aria-label="Niveau (caché)"
                />
              </div>
              <p className="text-xs text-(--muted-foreground)/70 mt-1.5">
                1 = racine de classe, 4 = feuille saisissable.
              </p>
            </div>
          </div>

          {/* Compte parent */}
          <div className="mb-4">
            <Label
              htmlFor="parent"
              className="text-sm font-medium text-(--foreground)"
            >
              Compte parent
              {!isRacine && (
                <span className="text-(--destructive)"> *</span>
              )}
            </Label>
            <Select
              value={form.fkCompteParent || NONE}
              onValueChange={(v) =>
                setForm({
                  ...form,
                  fkCompteParent: v === NONE ? '' : v,
                })
              }
              disabled={submitting}
            >
              <SelectTrigger id="parent" className="h-9 mt-1.5">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Aucun (racine)</SelectItem>
                {parentsEligibles.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.codeCompte} — {c.libelle} (niveau {c.niveau})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-(--muted-foreground)/70 mt-1.5">
              {isRacine
                ? 'Optionnel — un compte niveau 1 est typiquement racine de classe.'
                : 'Liste filtrée : niveau strictement inférieur, courants, actifs, même classe, hors descendants.'}
            </p>
          </div>

          {/* Sens (3 tiles) + Code poste budgétaire */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div>
              <Label className="text-sm font-medium text-(--foreground)">
                Sens (D / C / M)
              </Label>
              <div
                className="grid grid-cols-3 gap-2 mt-1.5"
                role="radiogroup"
                aria-label="Sens"
              >
                {SENS_TILES.map((tile) => (
                  <SensTile
                    key={tile.sens}
                    sens={tile.sens}
                    label={tile.label}
                    hex={tile.hex}
                    selected={form.sens === tile.sens}
                    onSelect={() =>
                      setForm({
                        ...form,
                        sens: form.sens === tile.sens ? '' : tile.sens,
                      })
                    }
                    disabled={submitting}
                  />
                ))}
                <input
                  id="sens"
                  type="hidden"
                  value={form.sens}
                  readOnly
                  aria-label="Sens (caché)"
                />
              </div>
              <p className="text-xs text-(--muted-foreground)/70 mt-1.5">
                Optionnel — Débit / Crédit / Mixte. Cliquer à nouveau pour désélectionner.
              </p>
            </div>

            <div>
              <Label
                htmlFor="codePosteBudgetaire"
                className="text-sm font-medium text-(--foreground)"
              >
                Code poste budgétaire
              </Label>
              <Input
                id="codePosteBudgetaire"
                value={form.codePosteBudgetaire}
                onChange={(e) =>
                  setForm({
                    ...form,
                    codePosteBudgetaire: e.target.value,
                  })
                }
                placeholder="ex. ACHATS_DIVERS"
                disabled={submitting}
                maxLength={50}
                className="h-9 mt-1.5"
              />
              <p className="text-xs text-(--muted-foreground)/70 mt-1.5">
                Optionnel — poste budgétaire libre.
              </p>
            </div>
          </div>

          {/* Type compte + Porteur intérêts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4 border-t border-(--border)">
            <div>
              <Label
                htmlFor="estCompteCollectif"
                className="text-sm font-medium text-(--foreground)"
              >
                Type de compte
              </Label>
              <label className="flex items-center gap-2 text-sm cursor-pointer mt-1.5">
                <input
                  id="estCompteCollectif"
                  type="checkbox"
                  checked={form.estCompteCollectif}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      estCompteCollectif: e.target.checked,
                    })
                  }
                  disabled={submitting}
                  className="h-4 w-4 rounded border border-(--border) accent-(--primary) cursor-pointer"
                />
                {form.estCompteCollectif
                  ? 'Collectif (agrégat)'
                  : 'Feuille (saisissable budget)'}
              </label>
            </div>

            <div>
              <Label
                htmlFor="estPorteurInterets"
                className="text-sm font-medium text-(--foreground)"
              >
                Porteur d&apos;intérêts
              </Label>
              <label className="flex items-center gap-2 text-sm cursor-pointer mt-1.5">
                <input
                  id="estPorteurInterets"
                  type="checkbox"
                  checked={form.estPorteurInterets}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      estPorteurInterets: e.target.checked,
                    })
                  }
                  disabled={submitting}
                  className="h-4 w-4 rounded border border-(--border) accent-(--primary) cursor-pointer"
                />
                {form.estPorteurInterets ? 'Oui' : 'Non'}
              </label>
            </div>
          </div>

          {mode === 'edit' && (
            <div className="mt-4 pt-4 border-t border-(--border)">
              <Label
                htmlFor="estActif"
                className="text-sm font-medium text-(--foreground)"
              >
                Statut
              </Label>
              <label className="flex items-center gap-2 text-sm cursor-pointer mt-1.5">
                <input
                  id="estActif"
                  type="checkbox"
                  checked={form.estActif}
                  onChange={(e) =>
                    setForm({ ...form, estActif: e.target.checked })
                  }
                  disabled={submitting}
                  className="h-4 w-4 rounded border border-(--border) accent-(--primary) cursor-pointer"
                />
                {form.estActif ? 'Actif' : 'Inactif'}
              </label>
            </div>
          )}
        </div>

        {/* Footer sticky (shrink-0) */}
        <div
          className="border-t border-(--border) px-7 py-3.5 flex justify-end gap-2.5 bg-(--secondary) shrink-0"
          data-testid="compte-form-footer"
        >
          <DialogClose asChild>
            <Button variant="outline" disabled={submitting} className="gap-1.5">
              <X className="w-3 h-3" />
              Annuler
            </Button>
          </DialogClose>
          <Button
            onClick={onSubmit}
            disabled={!canSubmit}
            className="bg-(--miznas-bleu-nuit-dark) hover:bg-(--miznas-bleu-nuit-dark)/90 text-white gap-1.5"
          >
            <Check className="w-3 h-3" />
            {submitting
              ? 'Enregistrement…'
              : mode === 'create'
                ? 'Créer le compte'
                : 'Enregistrer'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sous-composants ─────────────────────────────────────────────

interface NiveauTileProps {
  n: 1 | 2 | 3 | 4;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}

function NiveauTile({
  n,
  selected,
  onSelect,
  disabled,
}: NiveauTileProps): JSX.Element {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      disabled={disabled}
      data-testid={`niveau-tile-${n}`}
      className={cn(
        'h-9 border rounded-md flex items-center justify-center text-[13px] font-medium transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        selected
          ? 'border-(--miznas-ambre) bg-(--miznas-ambre)/10 text-(--miznas-ambre) font-semibold'
          : 'border-(--border) bg-white hover:bg-(--muted)/30',
      )}
    >
      {n}
    </button>
  );
}

interface SensTileProps {
  sens: SensCompte;
  label: string;
  hex: string;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}

function SensTile({
  sens,
  label,
  hex,
  selected,
  onSelect,
  disabled,
}: SensTileProps): JSX.Element {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      disabled={disabled}
      data-testid={`sens-tile-${sens}`}
      style={
        selected
          ? { borderColor: hex, backgroundColor: `${hex}10` }
          : undefined
      }
      className={cn(
        'h-9 border rounded-md flex flex-col items-center justify-center text-[11px] transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        !selected && 'border-(--border) bg-white hover:bg-(--muted)/30',
      )}
    >
      <span
        className="text-[13px] font-bold leading-none"
        style={selected ? { color: hex } : undefined}
      >
        {sens}
      </span>
      <span
        className="text-[10px] mt-0.5"
        style={selected ? { color: hex } : { color: 'var(--muted-foreground)' }}
      >
        {label}
      </span>
    </button>
  );
}
