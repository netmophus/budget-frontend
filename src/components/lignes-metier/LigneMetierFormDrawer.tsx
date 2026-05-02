/**
 * Drawer de création / édition d'une ligne métier (Lot 2.5D).
 *
 * Hiérarchique (auto-référence fk_ligne_metier_parent). Cas le plus
 * simple de la série 2.5A → 2.5F : 3 champs métier (code, libellé,
 * niveau) + parent. Aucune FK vers `ref_*` → pas de
 * <RefSecondaireSelect>. 4ᵉ consommateur de useScd2EditDiff.
 */
import { AxiosError } from 'axios';
import { AlertTriangle, Info, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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
  type CreateLigneMetierDto,
  createLigneMetier,
  type LigneMetier,
  type LigneMetierModeMaj,
  listLignesMetier,
  type UpdateLigneMetierDto,
  updateLigneMetier,
} from '@/lib/api/referentiels';
import { useScd2EditDiff } from '@/lib/hooks/useScd2EditDiff';

const NONE = '__none__';
const NIVEAU_MAX = 4;

interface FormState extends Record<string, unknown> {
  codeLigneMetier: string;
  libelle: string;
  niveau: number;
  fkLigneMetierParent: string;
  estActif: boolean;
}

const SCD2_FIELDS = ['libelle', 'niveau', 'fkLigneMetierParent'] as const;

function initialFromLigne(l: LigneMetier | null): FormState {
  if (!l) {
    return {
      codeLigneMetier: '',
      libelle: '',
      niveau: 1,
      fkLigneMetierParent: '',
      estActif: true,
    };
  }
  return {
    codeLigneMetier: l.codeLigneMetier,
    libelle: l.libelle,
    niveau: l.niveau,
    fkLigneMetierParent: l.fkLigneMetierParent ?? '',
    estActif: l.estActif,
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

interface LigneMetierFormDrawerProps {
  mode: 'create' | 'edit';
  initial?: LigneMetier | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (ligne: LigneMetier, modeMaj: LigneMetierModeMaj | null) => void;
}

const MODE_MAJ_LIBELLES: Record<LigneMetierModeMaj, string> = {
  no_op: 'Aucun changement détecté.',
  in_place_est_actif: 'Statut activé / désactivé.',
  ecrasement_intra_jour:
    'Modification appliquée (intra-jour, pas de nouvelle version).',
  nouvelle_version:
    "Nouvelle version SCD2 créée (l'ancienne est fermée).",
};

export function LigneMetierFormDrawer({
  mode,
  initial,
  isOpen,
  onClose,
  onSuccess,
}: LigneMetierFormDrawerProps) {
  const [form, setForm] = useState<FormState>(
    initialFromLigne(initial ?? null),
  );
  const [submitting, setSubmitting] = useState(false);
  const [allLignes, setAllLignes] = useState<LigneMetier[]>([]);

  // Charger les parents potentiels (auto-référence). On récupère
  // toutes les lignes courantes — le filtrage par niveau et anti-cycle
  // est calculé côté UI.
  useEffect(() => {
    if (!isOpen) return;
    listLignesMetier({ versionCouranteUniquement: true, limit: 200 })
      .then((res) => setAllLignes(res.items))
      .catch(() =>
        toast.error('Impossible de charger les lignes métier parentes'),
      );
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setForm(initialFromLigne(initial ?? null));
    }
  }, [isOpen, initial]);

  // Anti-cycle UI : exclure la ligne courante et tous ses descendants
  // (BFS sur fk_ligne_metier_parent).
  const idsExclus = useMemo(() => {
    if (mode !== 'edit' || !initial) return new Set<string>();
    const exclus = new Set<string>([initial.id]);
    let frontier = [initial.id];
    while (frontier.length > 0) {
      const next: string[] = [];
      for (const l of allLignes) {
        if (
          l.fkLigneMetierParent !== null &&
          frontier.includes(l.fkLigneMetierParent)
        ) {
          if (!exclus.has(l.id)) {
            exclus.add(l.id);
            next.push(l.id);
          }
        }
      }
      frontier = next;
    }
    return exclus;
  }, [allLignes, mode, initial]);

  const parentsEligibles = useMemo(() => {
    return allLignes.filter((l) => {
      if (idsExclus.has(l.id)) return false;
      if (l.niveau >= form.niveau) return false;
      if (!l.estActif) return false;
      return true;
    });
  }, [allLignes, idsExclus, form.niveau]);

  const codeValide =
    mode === 'edit'
      ? true
      : /^[A-Z0-9_]{2,50}$/.test(form.codeLigneMetier);
  const isRacine = form.niveau === 1;

  const canSubmit =
    !submitting &&
    form.libelle.trim() !== '' &&
    form.niveau >= 1 &&
    form.niveau <= NIVEAU_MAX &&
    codeValide &&
    (isRacine || form.fkLigneMetierParent !== '');

  const editDiff = useScd2EditDiff<FormState>({
    initial: initialFromLigne(initial ?? null),
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
        const dto: CreateLigneMetierDto = {
          codeLigneMetier: form.codeLigneMetier.toUpperCase(),
          libelle: form.libelle,
          niveau: form.niveau,
          ...(form.fkLigneMetierParent
            ? { fkLigneMetierParent: form.fkLigneMetierParent }
            : {}),
        };
        const created = await createLigneMetier(dto);
        onSuccess(created, null);
        return;
      }
      if (!initial) return;
      const dto: UpdateLigneMetierDto = {
        ...(editDiff.diff as UpdateLigneMetierDto),
      };
      // '' → null pour fkLigneMetierParent (signal racine)
      if (
        'fkLigneMetierParent' in dto &&
        (dto.fkLigneMetierParent as string) === ''
      ) {
        dto.fkLigneMetierParent = null;
      }
      const updated = await updateLigneMetier(initial.codeLigneMetier, dto);
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
          toast.error(`Le code '${form.codeLigneMetier}' existe déjà.`);
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
    mode === 'create' ? 'Nouvelle ligne métier' : 'Modifier la ligne métier';
  const description =
    mode === 'create'
      ? "Renseignez les informations pour créer une ligne métier."
      : `Code business : ${initial?.codeLigneMetier ?? ''}`;

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
                : bandeau.type === 'bleu'
                  ? 'rounded-md border border-blue-300 bg-blue-50 dark:bg-blue-950/30 p-3 text-sm space-y-1'
                  : 'rounded-md border border-sky-300 bg-sky-50 dark:bg-sky-950/30 p-3 text-sm space-y-1'
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
            <Label htmlFor="codeLigneMetier">
              Code ligne métier <span className="text-red-500">*</span>
            </Label>
            <Input
              id="codeLigneMetier"
              value={form.codeLigneMetier}
              onChange={(e) =>
                setForm({
                  ...form,
                  codeLigneMetier: e.target.value.toUpperCase(),
                })
              }
              placeholder="ex. RETAIL_PARTICULIERS"
              disabled={mode === 'edit' || submitting}
              maxLength={50}
            />
            <p className="text-xs text-(--muted-foreground)">
              {mode === 'edit'
                ? 'Le code business est immuable (la révision SCD2 préserve la business key).'
                : 'MAJUSCULES + chiffres + _, max 50 caractères.'}
              {mode === 'create' &&
                form.codeLigneMetier !== '' &&
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
              placeholder="ex. Particuliers"
              disabled={submitting}
              maxLength={200}
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
              max={NIVEAU_MAX}
              value={form.niveau}
              onChange={(e) =>
                setForm({ ...form, niveau: Number(e.target.value) })
              }
              disabled={submitting}
              className="w-32"
            />
            <p className="text-xs text-(--muted-foreground)">
              1 = racine, 2-{NIVEAU_MAX} = descendants.
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="parent">
              Ligne parente
              {!isRacine && <span className="text-red-500"> *</span>}
            </Label>
            <Select
              value={form.fkLigneMetierParent || NONE}
              onValueChange={(v) =>
                setForm({
                  ...form,
                  fkLigneMetierParent: v === NONE ? '' : v,
                })
              }
              disabled={submitting}
            >
              <SelectTrigger id="parent">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Aucune (racine)</SelectItem>
                {parentsEligibles.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.codeLigneMetier} — {l.libelle} (niveau {l.niveau})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-(--muted-foreground)">
              {isRacine
                ? "Optionnel — une ligne niveau 1 est typiquement racine."
                : 'Liste filtrée : niveau strictement inférieur, courantes, actives, hors descendants.'}
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
