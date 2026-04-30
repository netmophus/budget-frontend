import { AxiosError } from 'axios';
import { AlertTriangle, X } from 'lucide-react';
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
  type CreateStructureDto,
  createStructure,
  listStructures,
  type Structure,
  type StructureModeMaj,
  type TypeStructure,
  type UpdateStructureDto,
  updateStructure,
} from '@/lib/api/referentiels';
import { TYPES_STRUCTURE } from '@/lib/labels/referentiels';
import { UEMOA_COUNTRIES } from '@/lib/labels/uemoa';

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

interface FormState {
  codeStructure: string;
  libelle: string;
  libelleCourt: string;
  typeStructure: TypeStructure | '';
  niveauHierarchique: number;
  fkStructureParent: string; // surrogate id ; '' si racine
  codePays: string; // '' si non défini
  estActif: boolean;
}

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
  /** Mode : 'create' = nouvelle structure ; 'edit' = mise à jour. */
  mode: 'create' | 'edit';
  /** Structure existante en mode 'edit'. Ignoré en 'create'. */
  initial?: Structure | null;
  isOpen: boolean;
  onClose: () => void;
  /**
   * Callback appelé après un succès (création ou modification).
   * Reçoit la structure renvoyée par le backend + (en édition) le
   * mode d'application SCD2 retenu (no_op / in_place_est_actif /
   * ecrasement_intra_jour / nouvelle_version).
   */
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

  // Charger les parents potentiels (structures actives en version
  // courante). Le filtrage sur niveauHierarchique se fait côté UI.
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

  // Auto-suggestion du niveau hiérarchique selon le type (sans
  // écraser une valeur manuellement saisie en édition).
  function onTypeChange(t: TypeStructure) {
    const niveauSuggere = DEFAULT_NIVEAU_BY_TYPE[t];
    setForm((f) => ({
      ...f,
      typeStructure: t,
      // En création seulement : on aligne le niveau. En édition, on
      // laisse le niveau actuel pour ne pas surprendre l'utilisateur.
      niveauHierarchique:
        mode === 'create' ? niveauSuggere : f.niveauHierarchique,
    }));
  }

  // Parents éligibles : niveau strictement inférieur, courants, actifs.
  // En édition, exclure aussi la structure elle-même (pas d'auto-parent).
  const parentsEligibles = useMemo(() => {
    return parents.filter((p) => {
      if (p.niveauHierarchique >= form.niveauHierarchique) return false;
      if (mode === 'edit' && initial && p.id === initial.id) return false;
      if (!p.estActif) return false;
      return true;
    });
  }, [parents, form.niveauHierarchique, mode, initial]);

  const isEntiteJuridique = form.typeStructure === 'entite_juridique';
  // Validation côté UI — alignée sur le DTO backend.
  const codeValide = mode === 'edit'
    ? true
    : /^[A-Z0-9_-]{2,50}$/.test(form.codeStructure);
  const canSubmit =
    !submitting &&
    form.libelle.trim() !== '' &&
    form.typeStructure !== '' &&
    form.niveauHierarchique >= 1 &&
    form.niveauHierarchique <= 6 &&
    codeValide &&
    // entité juridique : parent + pays optionnels ; sinon required
    (isEntiteJuridique ||
      (form.fkStructureParent !== '' && form.codePays !== ''));

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
      const dto: UpdateStructureDto = {};
      if (form.libelle !== initial.libelle) dto.libelle = form.libelle;
      if ((form.libelleCourt || null) !== (initial.libelleCourt ?? null)) {
        dto.libelleCourt = form.libelleCourt || undefined;
      }
      if (form.typeStructure !== initial.typeStructure) {
        dto.typeStructure = form.typeStructure;
      }
      if (form.niveauHierarchique !== initial.niveauHierarchique) {
        dto.niveauHierarchique = form.niveauHierarchique;
      }
      if (
        (form.fkStructureParent || null) !==
        (initial.fkStructureParent ?? null)
      ) {
        dto.fkStructureParent = form.fkStructureParent || undefined;
      }
      if ((form.codePays || null) !== (initial.codePays ?? null)) {
        dto.codePays = form.codePays || undefined;
      }
      if (form.estActif !== initial.estActif) {
        dto.estActif = form.estActif;
      }
      const updated = await updateStructure(initial.codeStructure, dto);
      onSuccess(updated, updated.modeMaj ?? null);
      // Toast contextuel selon le mode d'application SCD2 retenu
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
      } else if (status === 422) {
        toast.error(message);
      } else if (status === 400) {
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

        {mode === 'edit' && (
          <div className="rounded-md border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30 p-3 text-sm space-y-1">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle className="h-4 w-4" />
              Modification SCD2 — Lecture importante
            </div>
            <p>
              Si vous modifiez le libellé, le type, le niveau, le parent ou le
              pays, cela créera une <strong>nouvelle version</strong> de cette
              structure. L'ancienne version est conservée historiquement et
              reste rattachée aux saisies budget déjà effectuées (comportement
              standard d'un historique SCD type 2).
            </p>
            <p>
              Si vous modifiez <strong>uniquement le statut Actif</strong> (et
              rien d'autre), aucune nouvelle version n'est créée.
            </p>
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
              <Select
                value={form.typeStructure || undefined}
                onValueChange={(v) => onTypeChange(v as TypeStructure)}
                disabled={submitting}
              >
                <SelectTrigger id="typeStructure">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {TYPES_STRUCTURE.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.libelle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <Select
              value={form.codePays || NONE}
              onValueChange={(v) =>
                setForm({ ...form, codePays: v === NONE ? '' : v })
              }
              disabled={submitting}
            >
              <SelectTrigger id="codePays">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Aucun</SelectItem>
                {UEMOA_COUNTRIES.map((p) => (
                  <SelectItem key={p.code} value={p.code}>
                    {p.code} — {p.libelle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              <p className="text-xs text-(--muted-foreground)">
                Si vous changez UNIQUEMENT ce champ, aucune nouvelle version
                SCD2 n'est créée (mise à jour en place).
              </p>
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
