/**
 * Drawer de création / édition d'une structure (Lot 2.5A).
 *
 * Refactor 2.5C : consomme la factorisation
 *  - <RefSecondaireSelect> pour les sélects type + pays
 *  - useScd2EditDiff pour le diff + le bandeau SCD2
 *
 * Le sélect parent reste un Select natif (pas un référentiel
 * secondaire — c'est une auto-référence sur dim_structure).
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
  type CreateStructureDto,
  createStructure,
  listStructures,
  type Structure,
  type StructureModeMaj,
  type TypeStructure,
  type UpdateStructureDto,
  updateStructure,
} from '@/lib/api/referentiels';
import { useRefSecondaireOptions } from '@/lib/hooks/useRefSecondaireOptions';
import { useScd2EditDiff } from '@/lib/hooks/useScd2EditDiff';

const NONE = '__none__';

/**
 * Niveaux par défaut suggérés selon le type de structure
 * (alignés sur la hiérarchie organisationnelle MIZNAS).
 */
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
  onSuccess: (
    structure: Structure,
    modeMaj: StructureModeMaj | null,
  ) => void;
}

const MODE_MAJ_LIBELLES: Record<StructureModeMaj, string> = {
  no_op: 'Aucun changement détecté.',
  in_place_est_actif: 'Statut activé / désactivé.',
  ecrasement_intra_jour:
    'Modification appliquée (intra-jour, pas de nouvelle version).',
  nouvelle_version:
    "Nouvelle version SCD2 créée (l'ancienne est fermée).",
};

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

  // On garde une lecture parallèle des hooks au niveau parent
  // UNIQUEMENT pour bloquer le submit si l'API référentiel est en
  // erreur. Les sélects gèrent loading + warning désactivée en
  // interne via <RefSecondaireSelect>.
  const { options: typeOptions, error: errorTypes } = useRefSecondaireOptions(
    'type-structure',
  );
  const { options: paysOptions, error: errorPays } = useRefSecondaireOptions(
    'pays',
  );

  // Charger les parents potentiels (auto-référence dim_structure).
  useEffect(() => {
    if (!isOpen) return;
    listStructures({ versionCouranteUniquement: true, limit: 200 })
      .then((res) => setParents(res.items))
      .catch(() => toast.error('Impossible de charger les structures parents'));
  }, [isOpen]);

  // Reset form quand on (ré)ouvre.
  useEffect(() => {
    if (isOpen) {
      setForm(initialFormFromStructure(initial ?? null));
    }
  }, [isOpen, initial]);

  // Auto-suggestion du niveau hiérarchique selon le type.
  function onTypeChange(t: string) {
    const niveauSuggere =
      DEFAULT_NIVEAU_BY_TYPE[t as TypeStructure] ?? null;
    setForm((f) => ({
      ...f,
      typeStructure: t as TypeStructure,
      niveauHierarchique:
        mode === 'create' && niveauSuggere !== null
          ? niveauSuggere
          : f.niveauHierarchique,
    }));
  }

  // Parents éligibles : niveau strictement inférieur, courants, actifs.
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
  const optionsIndisponibles =
    (errorTypes !== null && typeOptions.length === 0) ||
    (errorPays !== null && paysOptions.length === 0);

  const canSubmit =
    !submitting &&
    !optionsIndisponibles &&
    form.libelle.trim() !== '' &&
    form.typeStructure !== '' &&
    form.niveauHierarchique >= 1 &&
    form.niveauHierarchique <= 6 &&
    codeValide &&
    (isEntiteJuridique ||
      (form.fkStructureParent !== '' && form.codePays !== ''));

  // Bandeau SCD2 via le hook factorisé (Lot 2.5C).
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
          ...(form.libelleCourt
            ? { libelleCourt: form.libelleCourt }
            : {}),
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
      // Mode 'edit' : envoyer uniquement les champs modifiés.
      if (!initial) return;
      // editDiff.diff couvre les SCD2_FIELDS + estActif. Pour les
      // champs nullable (libelleCourt, fkStructureParent, codePays)
      // on convertit '' → undefined pour respecter l'API DTO.
      const dto: UpdateStructureDto = { ...(editDiff.diff as UpdateStructureDto) };
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
  const description =
    mode === 'create'
      ? 'Renseignez les informations pour créer une structure organisationnelle.'
      : `Code business : ${initial?.codeStructure ?? ''}`;

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
            <Label htmlFor="codeStructure">
              Code structure <span className="text-red-500">*</span>
            </Label>
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
            />
            <p className="text-xs text-(--muted-foreground)">
              {mode === 'edit'
                ? 'Le code business est immuable (la révision SCD2 préserve la business key).'
                : 'Code business stable, MAJUSCULES + chiffres + _ ou - (ex. AG_ABJ_PLATEAU). 2-50 caractères.'}
              {mode === 'create' &&
                form.codeStructure !== '' &&
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
              placeholder="ex. Agence Abidjan Plateau"
              disabled={submitting}
              maxLength={200}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="libelleCourt">Libellé court</Label>
            <Input
              id="libelleCourt"
              value={form.libelleCourt}
              onChange={(e) =>
                setForm({ ...form, libelleCourt: e.target.value })
              }
              placeholder="ex. Ag. Plateau"
              disabled={submitting}
              maxLength={50}
            />
            <p className="text-xs text-(--muted-foreground)">
              Optionnel — utilisé dans les restitutions compactes.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="typeStructure">
                Type <span className="text-red-500">*</span>
              </Label>
              <RefSecondaireSelect
                id="typeStructure"
                refKey="type-structure"
                value={form.typeStructure}
                onValueChange={onTypeChange}
                disabled={submitting}
                labelChamp="les types de structure"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="niveauHierarchique">
                Niveau hiérarchique <span className="text-red-500">*</span>
              </Label>
              <Input
                id="niveauHierarchique"
                type="number"
                min={1}
                max={6}
                value={form.niveauHierarchique}
                onChange={(e) =>
                  setForm({
                    ...form,
                    niveauHierarchique: Number(e.target.value),
                  })
                }
                disabled={submitting}
              />
              <p className="text-xs text-(--muted-foreground)">
                1=racine, 2=branche, 3=direction, 4=département, 5=agence.
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="parent">
              Structure parent
              {!isEntiteJuridique && <span className="text-red-500"> *</span>}
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
              <SelectTrigger id="parent">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Aucun (racine)</SelectItem>
                {parentsEligibles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.codeStructure} — {p.libelle} (niveau{' '}
                    {p.niveauHierarchique})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-(--muted-foreground)">
              {isEntiteJuridique
                ? 'Optionnel pour une entité juridique (typiquement racine).'
                : 'Liste filtrée aux structures de niveau strictement inférieur.'}
            </p>
          </div>

          <div className="space-y-1">
            <Label htmlFor="codePays">
              Pays UEMOA
              {!isEntiteJuridique && <span className="text-red-500"> *</span>}
            </Label>
            <RefSecondaireSelect
              id="codePays"
              refKey="pays"
              value={form.codePays}
              onValueChange={(v) => setForm({ ...form, codePays: v })}
              disabled={submitting}
              labelChamp="les pays"
            />
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
