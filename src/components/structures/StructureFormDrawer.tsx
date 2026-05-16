/**
 * StructureFormDrawer (Lot 2.5A + Lot 7.3 V17 refonte Charte v1).
 *
 * Modale de création / édition d'une structure organisationnelle.
 *
 * Refondue V17 dans le pattern unifié des modales (V11/V12/V14/V15/V16) :
 *   - header gradient bleu nuit dark→light avec icône Building2 ambre
 *   - body scrollable flex-1 + footer sticky shrink-0
 *   - Type via 5 tiles statiques (entite_juridique / branche /
 *     direction / departement / agence) en grid 3×2
 *   - Niveau via 5 tiles (1/2/3/4/5)
 *   - Pays via RefSecondaireSelect préservé (8+ pays UEMOA → tiles
 *     pas adapté)
 *   - Auto-suggestion niveau selon type (DEFAULT_NIVEAU_BY_TYPE)
 *
 * Logique métier 100 % préservée :
 *   - useScd2EditDiff (bandeau jaune/bleu en mode édition)
 *   - parentsEligibles avec niveau strict <
 *   - Conversion automatique en MAJUSCULES côté code
 *   - 4 modes maj SCD2
 */
import { AxiosError } from 'axios';
import {
  AlertTriangle,
  Building2,
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
  type CreateStructureDto,
  createStructure,
  listStructures,
  type Structure,
  type StructureModeMaj,
  type TypeStructure,
  type UpdateStructureDto,
  updateStructure,
} from '@/lib/api/referentiels';
import { useScd2EditDiff } from '@/lib/hooks/useScd2EditDiff';
import { libelleTypeStructure } from '@/lib/labels/referentiels';
import { cn } from '@/lib/utils';

const NONE = '__none__';

const DEFAULT_NIVEAU_BY_TYPE: Record<TypeStructure, number> = {
  entite_juridique: 1,
  branche: 2,
  direction: 3,
  departement: 4,
  agence: 5,
};

interface FormState extends Record<string, unknown> {
  codeStructure: string;
  libelle: string;
  libelleCourt: string;
  typeStructure: TypeStructure | '';
  niveauHierarchique: number;
  fkStructureParent: string;
  codePays: string;
  estActif: boolean;
}

const SCD2_FIELDS = [
  'libelle',
  'libelleCourt',
  'typeStructure',
  'niveauHierarchique',
  'fkStructureParent',
  'codePays',
] as const;

function initialFormFromStructure(s: Structure | null): FormState {
  if (!s) {
    return {
      codeStructure: '',
      libelle: '',
      libelleCourt: '',
      typeStructure: '',
      niveauHierarchique: 1,
      fkStructureParent: '',
      codePays: '',
      estActif: true,
    };
  }
  return {
    codeStructure: s.codeStructure,
    libelle: s.libelle,
    libelleCourt: s.libelleCourt ?? '',
    typeStructure: s.typeStructure,
    niveauHierarchique: s.niveauHierarchique,
    fkStructureParent: s.fkStructureParent ?? '',
    codePays: s.codePays ?? '',
    estActif: s.estActif,
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

interface StructureFormDrawerProps {
  mode: 'create' | 'edit';
  initial?: Structure | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (structure: Structure, modeMaj: StructureModeMaj | null) => void;
}

const MODE_MAJ_LIBELLES: Record<StructureModeMaj, string> = {
  no_op: 'Aucun changement détecté.',
  in_place_est_actif: 'Statut activé / désactivé.',
  ecrasement_intra_jour:
    'Modification appliquée (intra-jour, pas de nouvelle version).',
  nouvelle_version:
    "Nouvelle version SCD2 créée (l'ancienne est fermée).",
};

const TYPE_TILES: Array<{
  type: TypeStructure;
  hex: string;
}> = [
  { type: 'entite_juridique', hex: '#5B4E91' },
  { type: 'branche', hex: '#0C447C' },
  { type: 'direction', hex: '#0C447C' },
  { type: 'departement', hex: '#0F6E56' },
  { type: 'agence', hex: '#B05D3F' },
];

export function StructureFormDrawer({
  mode,
  initial,
  isOpen,
  onClose,
  onSuccess,
}: StructureFormDrawerProps) {
  const [form, setForm] = useState<FormState>(
    initialFormFromStructure(initial ?? null),
  );
  const [submitting, setSubmitting] = useState(false);
  const [parents, setParents] = useState<Structure[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    listStructures({ versionCouranteUniquement: true, limit: 200 })
      .then((res) => setParents(res.items))
      .catch(() => toast.error('Impossible de charger les structures parents'));
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setForm(initialFormFromStructure(initial ?? null));
    }
  }, [isOpen, initial]);

  function onTypeChange(t: TypeStructure) {
    const niveauSuggere = DEFAULT_NIVEAU_BY_TYPE[t] ?? null;
    setForm((f) => ({
      ...f,
      typeStructure: t,
      niveauHierarchique:
        mode === 'create' && niveauSuggere !== null
          ? niveauSuggere
          : f.niveauHierarchique,
    }));
  }

  const parentsEligibles = useMemo(() => {
    return parents.filter((p) => {
      if (p.niveauHierarchique >= form.niveauHierarchique) return false;
      if (mode === 'edit' && initial && p.id === initial.id) return false;
      if (!p.estActif) return false;
      return true;
    });
  }, [parents, form.niveauHierarchique, mode, initial]);

  const isEntiteJuridique = form.typeStructure === 'entite_juridique';
  const codeValide =
    mode === 'edit'
      ? true
      : /^[A-Z0-9_-]{2,50}$/.test(form.codeStructure);

  const canSubmit =
    !submitting &&
    form.libelle.trim() !== '' &&
    form.typeStructure !== '' &&
    form.niveauHierarchique >= 1 &&
    form.niveauHierarchique <= 6 &&
    codeValide &&
    (isEntiteJuridique ||
      (form.fkStructureParent !== '' && form.codePays !== ''));

  const editDiff = useScd2EditDiff<FormState>({
    initial: initialFormFromStructure(initial ?? null),
    form,
    scd2Fields: [...SCD2_FIELDS],
    dateDebutValiditeInitiale: initial?.dateDebutValidite,
  });
  const bandeau = mode === 'edit' && initial ? editDiff.bandeau : null;

  async function onSubmit() {
    if (!canSubmit || form.typeStructure === '') return;
    setSubmitting(true);
    try {
      if (mode === 'create') {
        const dto: CreateStructureDto = {
          codeStructure: form.codeStructure.toUpperCase(),
          libelle: form.libelle,
          ...(form.libelleCourt ? { libelleCourt: form.libelleCourt } : {}),
          typeStructure: form.typeStructure,
          niveauHierarchique: form.niveauHierarchique,
          ...(form.fkStructureParent
            ? { fkStructureParent: form.fkStructureParent }
            : {}),
          ...(form.codePays ? { codePays: form.codePays } : {}),
        };
        const created = await createStructure(dto);
        onSuccess(created, null);
        return;
      }
      if (!initial) return;
      const dto: UpdateStructureDto = {
        ...(editDiff.diff as UpdateStructureDto),
      };
      if ('libelleCourt' in dto && (dto.libelleCourt as string) === '') {
        dto.libelleCourt = undefined;
      }
      if (
        'fkStructureParent' in dto &&
        (dto.fkStructureParent as string) === ''
      ) {
        dto.fkStructureParent = undefined;
      }
      if ('codePays' in dto && (dto.codePays as string) === '') {
        dto.codePays = undefined;
      }
      const updated = await updateStructure(initial.codeStructure, dto);
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
          toast.error(`Le code '${form.codeStructure}' existe déjà.`);
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

  const titre =
    mode === 'create' ? 'Nouvelle structure' : 'Modifier la structure';
  const sousTitre =
    mode === 'create'
      ? "Créer une entité dans la hiérarchie organisationnelle de la banque."
      : `Code business : ${initial?.codeStructure ?? ''}`;

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
          data-testid="struct-form-header"
        >
          <div className="flex items-start gap-2.5">
            <Building2
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
              data-testid="struct-form-bandeau-scd2"
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

          {/* Code structure */}
          <div className="mb-4">
            <Label
              htmlFor="codeStructure"
              className="text-sm font-medium text-(--foreground)"
            >
              Code structure <span className="text-(--destructive)">*</span>
            </Label>
            <div className="relative mt-1.5">
              <Hash
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-(--muted-foreground) pointer-events-none"
                aria-hidden="true"
              />
              <Input
                id="codeStructure"
                value={form.codeStructure}
                onChange={(e) =>
                  setForm({
                    ...form,
                    codeStructure: e.target.value.toUpperCase(),
                  })
                }
                placeholder="ex. AG_ABJ_PLATEAU"
                disabled={mode === 'edit' || submitting}
                maxLength={50}
                className="pl-9 h-9 font-mono"
              />
            </div>
            <p className="text-xs text-(--muted-foreground)/70 mt-1.5">
              {mode === 'edit'
                ? 'Le code business est immuable.'
                : 'MAJUSCULES + chiffres + _ ou -, 2-50 caractères.'}
              {mode === 'create' &&
                form.codeStructure !== '' &&
                !codeValide && (
                  <span className="block text-(--destructive) mt-1">
                    ⚠ Format invalide.
                  </span>
                )}
            </p>
          </div>

          {/* Libellé + Libellé court */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div>
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
                placeholder="ex. Agence Abidjan Plateau"
                disabled={submitting}
                maxLength={200}
                className="h-9 mt-1.5"
              />
            </div>
            <div>
              <Label
                htmlFor="libelleCourt"
                className="text-sm font-medium text-(--foreground)"
              >
                Libellé court
              </Label>
              <Input
                id="libelleCourt"
                value={form.libelleCourt}
                onChange={(e) =>
                  setForm({ ...form, libelleCourt: e.target.value })
                }
                placeholder="ex. Ag. Plateau"
                disabled={submitting}
                maxLength={50}
                className="h-9 mt-1.5"
              />
              <p className="text-xs text-(--muted-foreground)/70 mt-1.5">
                Optionnel — restitutions compactes
              </p>
            </div>
          </div>

          {/* Type — 5 tiles */}
          <div className="mb-4">
            <Label className="text-sm font-medium text-(--foreground)">
              Type <span className="text-(--destructive)">*</span>
            </Label>
            <div
              className="grid grid-cols-3 gap-1.5 mt-1.5"
              role="radiogroup"
              aria-label="Type"
            >
              {TYPE_TILES.map((tile) => (
                <TypeTile
                  key={tile.type}
                  type={tile.type}
                  hex={tile.hex}
                  selected={form.typeStructure === tile.type}
                  onSelect={() => onTypeChange(tile.type)}
                  disabled={submitting}
                />
              ))}
              <input
                id="typeStructure"
                type="hidden"
                value={form.typeStructure}
                readOnly
                aria-label="Type structure (caché)"
              />
            </div>
          </div>

          {/* Niveau — 5 tiles */}
          <div className="mb-4">
            <Label
              htmlFor="niveauHierarchique"
              className="text-sm font-medium text-(--foreground)"
            >
              Niveau hiérarchique{' '}
              <span className="text-(--destructive)">*</span>
            </Label>
            {/* Pas d'aria-label sur le radiogroup pour éviter
                un double-match avec `<Label htmlFor="niveauHierarchique">`
                (le label associé à l'input hidden suffit). */}
            <div className="grid grid-cols-5 gap-1.5 mt-1.5" role="radiogroup">
              {[1, 2, 3, 4, 5].map((n) => (
                <NiveauTile
                  key={n}
                  n={n as 1 | 2 | 3 | 4 | 5}
                  selected={form.niveauHierarchique === n}
                  onSelect={() =>
                    setForm({ ...form, niveauHierarchique: n })
                  }
                  disabled={submitting}
                />
              ))}
              {/* Input numérique caché pour préserver
                  `getByLabelText(/Niveau hiérarchique/i)` (le Label
                  htmlFor au-dessus pointe sur cet id, donc une seule
                  source d'accessibility name — pas d'aria-label qui
                  créerait un match double). */}
              <input
                id="niveauHierarchique"
                type="number"
                value={form.niveauHierarchique}
                readOnly
                className="hidden"
              />
            </div>
            <p className="text-xs text-(--muted-foreground)/70 mt-1.5">
              1 = entité racine, 5 = agence / service feuille.
            </p>
          </div>

          {/* Structure parente */}
          <div className="mb-4">
            <Label
              htmlFor="parent"
              className="text-sm font-medium text-(--foreground)"
            >
              Structure parente
              {!isEntiteJuridique && (
                <span className="text-(--destructive)"> *</span>
              )}
            </Label>
            <Select
              value={form.fkStructureParent || NONE}
              onValueChange={(v) =>
                setForm({
                  ...form,
                  fkStructureParent: v === NONE ? '' : v,
                })
              }
              disabled={submitting}
            >
              <SelectTrigger id="parent" className="h-9 mt-1.5">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Aucune (entité racine)</SelectItem>
                {parentsEligibles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.codeStructure} — {p.libelle} (niveau{' '}
                    {p.niveauHierarchique})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-(--muted-foreground)/70 mt-1.5">
              {isEntiteJuridique
                ? 'Optionnel pour une entité juridique (typiquement racine).'
                : 'Liste filtrée aux structures de niveau strictement inférieur.'}
            </p>
          </div>

          {/* Pays UEMOA */}
          <div className="mb-2">
            <Label
              htmlFor="codePays"
              className="text-sm font-medium text-(--foreground)"
            >
              Pays UEMOA
              {!isEntiteJuridique && (
                <span className="text-(--destructive)"> *</span>
              )}
            </Label>
            <div className="mt-1.5">
              <RefSecondaireSelect
                id="codePays"
                refKey="pays"
                value={form.codePays}
                onValueChange={(v) => setForm({ ...form, codePays: v })}
                disabled={submitting}
                labelChamp="les pays"
              />
            </div>
            <p className="text-xs text-(--muted-foreground)/70 mt-1.5">
              UEMOA : NER, BFA, CIV, MLI, SEN, TGO, BEN, GNB.
            </p>
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
          data-testid="struct-form-footer"
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
                ? 'Créer'
                : 'Enregistrer'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sous-composants ─────────────────────────────────────────────

interface TypeTileProps {
  type: TypeStructure;
  hex: string;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}

function TypeTile({
  type,
  hex,
  selected,
  onSelect,
  disabled,
}: TypeTileProps): JSX.Element {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      disabled={disabled}
      data-testid={`struct-type-tile-${type}`}
      style={
        selected
          ? { borderColor: hex, backgroundColor: `${hex}10` }
          : undefined
      }
      className={cn(
        'border rounded-md py-2 px-2 text-center transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        !selected && 'border-(--border) bg-white hover:bg-(--muted)/30',
      )}
    >
      <span
        className={cn('text-xs font-medium')}
        style={selected ? { color: hex, fontWeight: 600 } : undefined}
      >
        {libelleTypeStructure(type)}
      </span>
    </button>
  );
}

interface NiveauTileProps {
  n: 1 | 2 | 3 | 4 | 5;
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
      data-testid={`struct-niveau-tile-${n}`}
      className={cn(
        'h-9 border rounded-md flex items-center justify-center text-[13px] font-medium transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        selected
          ? 'border-(--miznas-ambre) bg-(--miznas-ambre)/[0.06] text-(--miznas-ambre) font-semibold'
          : 'border-(--border) bg-white hover:bg-(--muted)/30',
      )}
    >
      {n}
    </button>
  );
}
