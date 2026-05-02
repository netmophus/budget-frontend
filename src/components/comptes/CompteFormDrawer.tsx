/**
 * Drawer de création / édition d'un compte (Lot 2.5E).
 *
 * Le plus complexe de la série 2.5A → 2.5F : 10 champs métier dont
 * 2 alimentés par référentiels secondaires (classe + sens). Drawer
 * hiérarchique 4 niveaux avec auto-référence `fk_compte_parent` et
 * cohérence niveau / classe imposée backend.
 *
 * 5ᵉ consommateur de useScd2EditDiff. Consomme 2× <RefSecondaireSelect>.
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

  // Charger TOUS les comptes courants (limit 200 ; le seed actuel
  // contient ~105 comptes — large marge).
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

  // Anti-cycle UI : exclure le compte courant et tous ses descendants
  // (BFS sur fk_compte_parent).
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

  // Filtrage des parents éligibles : niveau strictement inférieur,
  // active, courant, hors descendants. Cohérence classe : si la
  // classe est définie, parent doit être de la même classe.
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
    mode === 'edit'
      ? true
      : /^[0-9]{1,20}$/.test(form.codeCompte);
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
      const dto: UpdateCompteDto = {
        ...(editDiff.diff as UpdateCompteDto),
      };
      if (
        'fkCompteParent' in dto &&
        (dto.fkCompteParent as string) === ''
      ) {
        dto.fkCompteParent = null;
      }
      // sens '' → ne pas envoyer (champ optionnel, pas de "clear" backend)
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

  const titre =
    mode === 'create' ? 'Nouveau compte' : 'Modifier le compte';
  const description =
    mode === 'create'
      ? "Renseignez les informations pour créer un compte PCB UMOA."
      : `Code business : ${initial?.codeCompte ?? ''}`;

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && !submitting && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="codeCompte">
                Code compte <span className="text-red-500">*</span>
              </Label>
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
              />
              <p className="text-xs text-(--muted-foreground)">
                {mode === 'edit'
                  ? 'Le code business est immuable.'
                  : 'Numérique uniquement, max 20 caractères.'}
                {mode === 'create' &&
                  form.codeCompte !== '' &&
                  !codeValide && (
                    <span className="block text-red-600">
                      ⚠ Format invalide.
                    </span>
                  )}
              </p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="classe">
                Classe <span className="text-red-500">*</span>
              </Label>
              <RefSecondaireSelect
                id="classe"
                refKey="classe-compte"
                value={form.classe}
                onValueChange={(v) => setForm({ ...form, classe: v })}
                disabled={mode === 'edit' || submitting}
                labelChamp="les classes PCB"
              />
              <p className="text-xs text-(--muted-foreground)">
                {mode === 'edit'
                  ? 'La classe est immuable (la révision SCD2 préserve le rattachement).'
                  : 'PCB UMOA Révisé — classes 1 à 9.'}
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="libelle">
              Libellé <span className="text-red-500">*</span>
            </Label>
            <Input
              id="libelle"
              value={form.libelle}
              onChange={(e) => setForm({ ...form, libelle: e.target.value })}
              placeholder="ex. Fournitures de bureau"
              disabled={submitting}
              maxLength={200}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="sousClasse">Sous-classe</Label>
              <Input
                id="sousClasse"
                value={form.sousClasse}
                onChange={(e) =>
                  setForm({ ...form, sousClasse: e.target.value })
                }
                placeholder="ex. 60"
                disabled={submitting}
                maxLength={20}
              />
              <p className="text-xs text-(--muted-foreground)">
                Optionnel — groupement pédagogique.
              </p>
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
                1 = racine de classe, 4 = feuille saisissable.
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="parent">
              Compte parent
              {!isRacine && <span className="text-red-500"> *</span>}
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
              <SelectTrigger id="parent">
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
            <p className="text-xs text-(--muted-foreground)">
              {isRacine
                ? "Optionnel — un compte niveau 1 est typiquement racine de classe."
                : "Liste filtrée : niveau strictement inférieur, courants, actifs, même classe, hors descendants."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="sens">Sens (D / C / M)</Label>
              <RefSecondaireSelect
                id="sens"
                refKey="sens-compte"
                value={form.sens}
                onValueChange={(v) => setForm({ ...form, sens: v })}
                disabled={submitting}
                labelChamp="les sens comptables"
              />
              <p className="text-xs text-(--muted-foreground)">
                Optionnel — Débit / Crédit / Mixte.
              </p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="codePosteBudgetaire">Code poste budgétaire</Label>
              <Input
                id="codePosteBudgetaire"
                value={form.codePosteBudgetaire}
                onChange={(e) =>
                  setForm({ ...form, codePosteBudgetaire: e.target.value })
                }
                placeholder="ex. ACHATS_DIVERS"
                disabled={submitting}
                maxLength={50}
              />
              <p className="text-xs text-(--muted-foreground)">
                Optionnel — poste budgétaire libre (formalisé Lot 4).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="space-y-1">
              <Label htmlFor="estCompteCollectif">Type de compte</Label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
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
                {form.estPorteurInterets ? 'Oui' : 'Non'}
              </label>
            </div>
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
