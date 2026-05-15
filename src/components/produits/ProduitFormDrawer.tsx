/**
 * ProduitFormDrawer (Lot 2.5C + Lot 7.3 V15 refonte Charte v1).
 *
 * Modale de création / édition d'un produit bancaire.
 *
 * Refondue V15 dans le pattern unifié des modales (V11/V12/V14) :
 *   - header gradient bleu nuit dark→light avec icône Package ambre
 *   - body scrollable flex-1 + footer sticky shrink-0
 *   - Type via 5 tiles statiques (CREDIT/DEPOT/SERVICE/MARCHE/AUTRE)
 *     avec couleurs catégorie au sélectionné
 *   - Niveau via 4 tiles (1/2/3/4)
 *   - Bandeau ambre dédié au toggle "Porteur d'intérêts" (PNB)
 *
 * Logique métier 100 % préservée :
 *   - useScd2EditDiff (bandeau jaune/bleu en mode édition)
 *   - parentsEligibles avec anti-cycle BFS (descendance exclue)
 *   - Conversion automatique en MAJUSCULES côté code
 *   - 4 modes maj SCD2 (no_op / in_place_est_actif /
 *     ecrasement_intra_jour / nouvelle_version)
 */
import { AxiosError } from 'axios';
import {
  AlertTriangle,
  Check,
  Hash,
  Info,
  Package,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

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
  type CreateProduitDto,
  createProduit,
  listProduits,
  type Produit,
  type ProduitModeMaj,
  type UpdateProduitDto,
  updateProduit,
} from '@/lib/api/referentiels';
import { useScd2EditDiff } from '@/lib/hooks/useScd2EditDiff';
import { cn } from '@/lib/utils';

const NONE = '__none__';

interface FormState extends Record<string, unknown> {
  codeProduit: string;
  libelle: string;
  typeProduit: string;
  niveau: number;
  fkProduitParent: string;
  estPorteurInterets: boolean;
  estActif: boolean;
}

const SCD2_FIELDS = [
  'libelle',
  'typeProduit',
  'niveau',
  'fkProduitParent',
  'estPorteurInterets',
] as const;

function initialFromProduit(p: Produit | null): FormState {
  if (!p) {
    return {
      codeProduit: '',
      libelle: '',
      typeProduit: '',
      niveau: 1,
      fkProduitParent: '',
      estPorteurInterets: false,
      estActif: true,
    };
  }
  return {
    codeProduit: p.codeProduit,
    libelle: p.libelle,
    typeProduit: p.typeProduit,
    niveau: p.niveau,
    fkProduitParent: p.fkProduitParent ?? '',
    estPorteurInterets: p.estPorteurInterets,
    estActif: p.estActif,
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

interface ProduitFormDrawerProps {
  mode: 'create' | 'edit';
  initial?: Produit | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (produit: Produit, modeMaj: ProduitModeMaj | null) => void;
}

const MODE_MAJ_LIBELLES: Record<ProduitModeMaj, string> = {
  no_op: 'Aucun changement détecté.',
  in_place_est_actif: 'Statut activé / désactivé.',
  ecrasement_intra_jour:
    'Modification appliquée (intra-jour, pas de nouvelle version).',
  nouvelle_version:
    "Nouvelle version SCD2 créée (l'ancienne est fermée).",
};

const TYPE_TILES: Array<{
  type: string;
  label: string;
  hex: string;
}> = [
  { type: 'credit', label: 'Crédit', hex: '#DC2626' },
  { type: 'depot', label: 'Dépôt', hex: '#0F6E56' },
  { type: 'service', label: 'Service', hex: '#0C447C' },
  { type: 'marche', label: 'Marché', hex: '#5B4E91' },
  { type: 'autre', label: 'Autre', hex: '#5F6B7A' },
];

export function ProduitFormDrawer({
  mode,
  initial,
  isOpen,
  onClose,
  onSuccess,
}: ProduitFormDrawerProps) {
  const [form, setForm] = useState<FormState>(
    initialFromProduit(initial ?? null),
  );
  const [submitting, setSubmitting] = useState(false);
  const [allProduits, setAllProduits] = useState<Produit[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    listProduits({ versionCouranteUniquement: true, limit: 200 })
      .then((res) => setAllProduits(res.items))
      .catch(() => toast.error('Impossible de charger les produits parents'));
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setForm(initialFromProduit(initial ?? null));
    }
  }, [isOpen, initial]);

  const idsExclus = useMemo(() => {
    if (mode !== 'edit' || !initial) return new Set<string>();
    const exclus = new Set<string>([initial.id]);
    let frontier = [initial.id];
    while (frontier.length > 0) {
      const next: string[] = [];
      for (const p of allProduits) {
        if (
          p.fkProduitParent !== null &&
          frontier.includes(p.fkProduitParent)
        ) {
          if (!exclus.has(p.id)) {
            exclus.add(p.id);
            next.push(p.id);
          }
        }
      }
      frontier = next;
    }
    return exclus;
  }, [allProduits, mode, initial]);

  const parentsEligibles = useMemo(() => {
    return allProduits.filter((p) => {
      if (idsExclus.has(p.id)) return false;
      if (p.niveau >= form.niveau) return false;
      if (!p.estActif) return false;
      return true;
    });
  }, [allProduits, idsExclus, form.niveau]);

  const codeValide =
    mode === 'edit'
      ? true
      : /^[A-Z0-9_]{2,50}$/.test(form.codeProduit);
  const isRacine = form.niveau === 1;

  const canSubmit =
    !submitting &&
    form.libelle.trim() !== '' &&
    form.typeProduit !== '' &&
    form.niveau >= 1 &&
    form.niveau <= 4 &&
    codeValide &&
    (isRacine || form.fkProduitParent !== '');

  const editDiff = useScd2EditDiff<FormState>({
    initial: initialFromProduit(initial ?? null),
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
        const dto: CreateProduitDto = {
          codeProduit: form.codeProduit.toUpperCase(),
          libelle: form.libelle,
          typeProduit: form.typeProduit,
          niveau: form.niveau,
          ...(form.fkProduitParent
            ? { fkProduitParent: form.fkProduitParent }
            : {}),
          estPorteurInterets: form.estPorteurInterets,
        };
        const created = await createProduit(dto);
        onSuccess(created, null);
        return;
      }
      if (!initial) return;
      const dto: UpdateProduitDto = {
        ...(editDiff.diff as UpdateProduitDto),
      };
      if (
        'fkProduitParent' in dto &&
        (dto.fkProduitParent as string) === ''
      ) {
        dto.fkProduitParent = null;
      }
      const updated = await updateProduit(initial.codeProduit, dto);
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
          toast.error(`Le code '${form.codeProduit}' existe déjà.`);
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

  const titre = mode === 'create' ? 'Nouveau produit' : 'Modifier le produit';
  const sousTitre =
    mode === 'create'
      ? 'Catalogue produit crédit / dépôt / service / marché.'
      : `Code business : ${initial?.codeProduit ?? ''}`;

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && !submitting && onClose()}>
      <DialogContent
        className={
          '!p-0 gap-0 overflow-hidden !max-w-xl max-h-[90vh] ' +
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
          data-testid="prod-form-header"
        >
          <div className="flex items-start gap-2.5">
            <Package
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
              data-testid="prod-form-bandeau-scd2"
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

          {/* Code */}
          <div className="mb-4">
            <Label
              htmlFor="codeProduit"
              className="text-sm font-medium text-(--foreground)"
            >
              Code produit <span className="text-(--destructive)">*</span>
            </Label>
            <div className="relative mt-1.5">
              <Hash
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-(--muted-foreground) pointer-events-none"
                aria-hidden="true"
              />
              <Input
                id="codeProduit"
                value={form.codeProduit}
                onChange={(e) =>
                  setForm({
                    ...form,
                    codeProduit: e.target.value.toUpperCase(),
                  })
                }
                placeholder="ex. CREDIT_DECOUVERT"
                disabled={mode === 'edit' || submitting}
                maxLength={50}
                className="pl-9 h-9 font-mono"
              />
            </div>
            <p className="text-xs text-(--muted-foreground)/70 mt-1.5">
              {mode === 'edit'
                ? 'Le code business est immuable.'
                : 'MAJUSCULES + chiffres + _, max 50 caractères.'}
              {mode === 'create' &&
                form.codeProduit !== '' &&
                !codeValide && (
                  <span className="block text-(--destructive) mt-1">
                    ⚠ Format invalide.
                  </span>
                )}
            </p>
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
              placeholder="ex. Découverts particuliers"
              disabled={submitting}
              maxLength={200}
              className="h-9 mt-1.5"
            />
          </div>

          {/* Type — 5 tiles */}
          <div className="mb-4">
            <Label className="text-sm font-medium text-(--foreground)">
              Type <span className="text-(--destructive)">*</span>
            </Label>
            <div
              className="grid grid-cols-5 gap-1.5 mt-1.5"
              role="radiogroup"
              aria-label="Type"
            >
              {TYPE_TILES.map((tile) => (
                <TypeTile
                  key={tile.type}
                  type={tile.type}
                  label={tile.label}
                  hex={tile.hex}
                  selected={form.typeProduit === tile.type}
                  onSelect={() =>
                    setForm({ ...form, typeProduit: tile.type })
                  }
                  disabled={submitting}
                />
              ))}
              <input
                id="typeProduit"
                type="hidden"
                value={form.typeProduit}
                readOnly
                aria-label="Type produit (caché)"
              />
            </div>
          </div>

          {/* Niveau — 4 tiles */}
          <div className="mb-4">
            <Label className="text-sm font-medium text-(--foreground)">
              Niveau <span className="text-(--destructive)">*</span>
            </Label>
            <div
              className="grid grid-cols-4 gap-1.5 mt-1.5"
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
              <input
                id="niveau"
                type="hidden"
                value={form.niveau}
                readOnly
                aria-label="Niveau (caché)"
              />
            </div>
            <p className="text-xs text-(--muted-foreground)/70 mt-1.5">
              1 = racine, 2-4 = descendants.
            </p>
          </div>

          {/* Parent */}
          <div className="mb-4">
            <Label
              htmlFor="parent"
              className="text-sm font-medium text-(--foreground)"
            >
              Produit parent
              {!isRacine && <span className="text-(--destructive)"> *</span>}
            </Label>
            <Select
              value={form.fkProduitParent || NONE}
              onValueChange={(v) =>
                setForm({
                  ...form,
                  fkProduitParent: v === NONE ? '' : v,
                })
              }
              disabled={submitting}
            >
              <SelectTrigger id="parent" className="h-9 mt-1.5">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Aucun (racine)</SelectItem>
                {parentsEligibles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.codeProduit} — {p.libelle} (niveau {p.niveau})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-(--muted-foreground)/70 mt-1.5">
              {isRacine
                ? 'Optionnel — un produit niveau 1 est typiquement racine.'
                : 'Liste filtrée : niveau strictement inférieur, courants, actifs, hors descendants.'}
            </p>
          </div>

          {/* Bandeau ambre Porteur d'intérêts */}
          <div
            className="bg-(--miznas-ambre)/[0.04] border-l-[3px] border-(--miznas-ambre) rounded-sm px-3.5 py-2.5"
            data-testid="prod-form-bandeau-pnb"
          >
            <label className="flex items-start gap-2.5 cursor-pointer">
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
                className="h-4 w-4 mt-0.5 rounded border border-(--border) accent-(--miznas-ambre) cursor-pointer"
              />
              <div>
                <div className="text-[13px] font-semibold">
                  Porteur d&apos;intérêts
                </div>
                <div className="text-[11px] text-(--muted-foreground) mt-0.5 leading-relaxed">
                  Coche si le produit génère du PNB (ex. crédits, dépôts à
                  terme).
                </div>
              </div>
            </label>
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
          data-testid="prod-form-footer"
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
  type: string;
  label: string;
  hex: string;
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}

function TypeTile({
  type,
  label,
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
      data-testid={`prod-type-tile-${type}`}
      style={
        selected
          ? { borderColor: hex, backgroundColor: `${hex}10` }
          : undefined
      }
      className={cn(
        'h-9 border rounded-md flex items-center justify-center text-xs font-medium transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        !selected && 'border-(--border) bg-white hover:bg-(--muted)/30',
      )}
    >
      <span
        style={selected ? { color: hex } : undefined}
        className={selected ? 'font-semibold' : ''}
      >
        {label}
      </span>
    </button>
  );
}

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
      data-testid={`prod-niveau-tile-${n}`}
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
