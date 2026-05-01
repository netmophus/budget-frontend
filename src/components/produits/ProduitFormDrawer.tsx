/**
 * Drawer de création / édition d'un produit (Lot 2.5C).
 *
 * Hiérarchique (auto-référence fk_produit_parent) — pattern miroir de
 * StructureFormDrawer mais consomme directement la factorisation
 * 2.5C : <RefSecondaireSelect> + useScd2EditDiff.
 */
import { AxiosError } from 'axios';
import { AlertTriangle, Info, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { RefSecondaireSelect } from '@/components/common/RefSecondaireSelect';
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
  type CreateProduitDto,
  createProduit,
  listProduits,
  type Produit,
  type ProduitModeMaj,
  type UpdateProduitDto,
  updateProduit,
} from '@/lib/api/referentiels';
import { useRefSecondaireOptions } from '@/lib/hooks/useRefSecondaireOptions';
import { useScd2EditDiff } from '@/lib/hooks/useScd2EditDiff';

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

  // Lecture parallèle pour bloquer le submit si l'API référentiel
  // est en erreur (le sélect gère loading + warning en interne).
  const { options: typeOptions, error: errorTypes } = useRefSecondaireOptions(
    'type-produit',
  );

  // Charger les parents potentiels (auto-référence dim_produit). On
  // récupère TOUS les produits courants — le filtrage par niveau et
  // anti-cycle se fait côté UI.
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

  // Anti-cycle UI : exclure le produit courant et ses descendants
  // (calculés depuis allProduits, BFS sur fk_produit_parent).
  const idsExclus = useMemo(() => {
    if (mode !== 'edit' || !initial) return new Set<string>();
    const exclus = new Set<string>([initial.id]);
    let frontier = [initial.id];
    while (frontier.length > 0) {
      const next: string[] = [];
      for (const p of allProduits) {
        if (p.fkProduitParent !== null && frontier.includes(p.fkProduitParent)) {
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
  const optionsIndisponibles =
    errorTypes !== null && typeOptions.length === 0;
  const isRacine = form.niveau === 1;

  const canSubmit =
    !submitting &&
    !optionsIndisponibles &&
    form.libelle.trim() !== '' &&
    form.typeProduit !== '' &&
    form.niveau >= 1 &&
    form.niveau <= 4 &&
    codeValide &&
    // Niveau >= 2 → parent requis
    (isRacine || form.fkProduitParent !== '');

  // Bandeau SCD2 via le hook factorisé.
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
      // Mode 'edit' : envoyer uniquement le diff calculé.
      if (!initial) return;
      const dto: UpdateProduitDto = { ...(editDiff.diff as UpdateProduitDto) };
      // '' → null pour fkProduitParent (signal racine)
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

  const titre =
    mode === 'create' ? 'Nouveau produit' : 'Modifier le produit';
  const description =
    mode === 'create'
      ? "Renseignez les informations pour créer un produit bancaire."
      : `Code business : ${initial?.codeProduit ?? ''}`;

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && !submitting && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titre}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {bandeau && (
          <div
            className={
              bandeau.type === 'jaune'
                ? 'rounded-md border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30 p-3 text-sm space-y-1'
                : 'rounded-md border border-blue-300 bg-blue-50 dark:bg-blue-950/30 p-3 text-sm space-y-1'
            }
          >
            <div className="flex items-center gap-2 font-semibold">
              {bandeau.type === 'jaune' ? (
                <AlertTriangle className="h-4 w-4" />
              ) : (
                <Info className="h-4 w-4" />
              )}
              {bandeau.titre}
            </div>
            <p>{bandeau.message}</p>
          </div>
        )}

        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <Label htmlFor="codeProduit">
              Code produit <span className="text-red-500">*</span>
            </Label>
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
            />
            <p className="text-xs text-(--muted-foreground)">
              {mode === 'edit'
                ? 'Le code business est immuable (la révision SCD2 préserve la business key).'
                : 'MAJUSCULES + chiffres + _, max 50 caractères.'}
              {mode === 'create' &&
                form.codeProduit !== '' &&
                !codeValide && (
                  <span className="block text-red-600">
                    ⚠ Format invalide.
                  </span>
                )}
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="libelle">
              Libellé <span className="text-red-500">*</span>
            </Label>
            <Input
              id="libelle"
              value={form.libelle}
              onChange={(e) => setForm({ ...form, libelle: e.target.value })}
              placeholder="ex. Découverts particuliers"
              disabled={submitting}
              maxLength={200}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="typeProduit">
                Type <span className="text-red-500">*</span>
              </Label>
              <RefSecondaireSelect
                id="typeProduit"
                refKey="type-produit"
                value={form.typeProduit}
                onValueChange={(v) => setForm({ ...form, typeProduit: v })}
                disabled={submitting}
                labelChamp="les types de produit"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="niveau">
                Niveau <span className="text-red-500">*</span>
              </Label>
              <Input
                id="niveau"
                type="number"
                min={1}
                max={4}
                value={form.niveau}
                onChange={(e) =>
                  setForm({ ...form, niveau: Number(e.target.value) })
                }
                disabled={submitting}
              />
              <p className="text-xs text-(--muted-foreground)">
                1=racine, 2-4=descendants.
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="parent">
              Produit parent
              {!isRacine && <span className="text-red-500"> *</span>}
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
              <SelectTrigger id="parent">
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
            <p className="text-xs text-(--muted-foreground)">
              {isRacine
                ? "Optionnel — un produit niveau 1 est typiquement racine."
                : 'Liste filtrée : niveau strictement inférieur, courants, actifs, hors descendants.'}
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="estPorteurInterets">Porteur d'intérêts</Label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
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
              {form.estPorteurInterets ? 'Oui (PNB)' : 'Non'}
            </label>
            <p className="text-xs text-(--muted-foreground)">
              Coche si le produit génère du PNB (ex. crédits, dépôts à terme).
            </p>
          </div>

          {mode === 'edit' && (
            <div className="space-y-1">
              <Label htmlFor="estActif">Statut</Label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
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

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            <X className="h-4 w-4 mr-2" /> Annuler
          </Button>
          <Button onClick={onSubmit} disabled={!canSubmit}>
            {submitting
              ? 'Enregistrement…'
              : mode === 'create'
                ? 'Créer'
                : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
