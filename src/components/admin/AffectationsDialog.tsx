/**
 * AffectationsDialog (Lot 4.1.C) — gestion des affectations
 * multi-périmètres pour un utilisateur. 3 cible_type :
 *   - STRUCTURE → 1 structure (descente d'arbre)
 *   - CR        → 1 CR unique
 *   - CR_SET    → ≥ 2 CR (multi-select)
 *
 * Liste les affectations existantes (avec bouton retrait soft) et
 * permet d'en ajouter de nouvelles. Validation côté client :
 *   - cible obligatoire selon le type
 *   - CR_SET : ≥ 2 CR requis
 *   - date_fin >= date_debut si fournie
 */
import { AxiosError } from 'axios';
import { Briefcase, Grid3x3, Target, Trash2, X } from 'lucide-react';
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
  type AffectationPerimetre,
  CIBLE_TYPE_LABEL,
  type CiblePerimetreType,
  creerAffectationPerimetre,
  listerPerimetresUser,
  retirerAffectationPerimetre,
} from '@/lib/api/perimetres';
import { listCrs, listStructures } from '@/lib/api/referentiels';

interface AffectationsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  userLibelle: string;
}

interface OptionRef {
  id: string;
  libelle: string;
  code: string;
}

function parseError(err: unknown): string {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { message?: string | string[] } | undefined;
    const msg = Array.isArray(data?.message)
      ? data!.message.join(' ; ')
      : (data?.message ?? err.message);
    return msg;
  }
  return err instanceof Error ? err.message : 'Erreur';
}

export function AffectationsDialog({
  isOpen,
  onClose,
  userId,
  userLibelle,
}: AffectationsDialogProps): JSX.Element {
  const [structures, setStructures] = useState<OptionRef[]>([]);
  const [crs, setCrs] = useState<OptionRef[]>([]);
  const [affectations, setAffectations] = useState<AffectationPerimetre[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [cibleType, setCibleType] = useState<CiblePerimetreType | ''>('');
  const [cibleId, setCibleId] = useState<string>('');
  const [cibleCrIds, setCibleCrIds] = useState<string[]>([]);
  const [dateDebut, setDateDebut] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );
  const [dateFin, setDateFin] = useState<string>('');
  const [motif, setMotif] = useState<string>('');

  // Charge les référentiels + affectations à l'ouverture
  useEffect(() => {
    if (!isOpen || !userId) return;
    setLoading(true);
    Promise.all([
      listStructures({ versionCouranteUniquement: true, limit: 200 }),
      listCrs({ limit: 200 }),
      listerPerimetresUser(userId),
    ])
      .then(([s, c, a]) => {
        setStructures(
          s.items.map((x) => ({ id: x.id, libelle: x.libelle, code: x.codeStructure })),
        );
        setCrs(
          c.items.map((x) => ({ id: x.id, libelle: x.libelle, code: x.codeCr })),
        );
        setAffectations(a);
      })
      .catch((err) => toast.error(`Chargement impossible : ${parseError(err)}`))
      .finally(() => setLoading(false));
  }, [isOpen, userId]);

  function resetForm(): void {
    setCibleType('');
    setCibleId('');
    setCibleCrIds([]);
    setDateFin('');
    setMotif('');
  }

  const dateError = useMemo(() => {
    if (dateFin && dateFin < dateDebut) {
      return 'date_fin doit être ≥ date_debut';
    }
    return null;
  }, [dateDebut, dateFin]);

  const peutAjouter = useMemo(() => {
    if (!cibleType || dateError) return false;
    if (cibleType === 'STRUCTURE' || cibleType === 'CR') {
      return cibleId.length > 0;
    }
    if (cibleType === 'CR_SET') {
      return cibleCrIds.length >= 2;
    }
    return false;
  }, [cibleType, cibleId, cibleCrIds, dateError]);

  async function handleAjouter(): Promise<void> {
    if (!userId || !cibleType) return;
    setSubmitting(true);
    try {
      const dto = {
        cibleType,
        cibleId: cibleType === 'CR_SET' ? undefined : cibleId,
        cibleCrIds: cibleType === 'CR_SET' ? cibleCrIds : undefined,
        dateDebut,
        dateFin: dateFin || undefined,
        motif: motif || undefined,
      };
      await creerAffectationPerimetre(userId, dto);
      toast.success('Affectation créée.');
      const a = await listerPerimetresUser(userId);
      setAffectations(a);
      resetForm();
    } catch (err) {
      toast.error(`Création refusée : ${parseError(err)}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRetirer(id: string): Promise<void> {
    if (!userId) return;
    try {
      await retirerAffectationPerimetre(userId, id);
      toast.success('Affectation retirée.');
      const a = await listerPerimetresUser(userId);
      setAffectations(a);
    } catch (err) {
      toast.error(`Retrait refusé : ${parseError(err)}`);
    }
  }

  function libelleCible(a: AffectationPerimetre): string {
    if (a.cibleType === 'STRUCTURE') {
      const s = structures.find((x) => x.id === a.cibleId);
      return s ? `${s.code} — ${s.libelle}` : a.cibleId ?? '?';
    }
    if (a.cibleType === 'CR') {
      const c = crs.find((x) => x.id === a.cibleId);
      return c ? `${c.code} — ${c.libelle}` : a.cibleId ?? '?';
    }
    if (a.cibleType === 'CR_SET') {
      const ids = a.cibleCrIds ?? [];
      const noms = ids.map((id) => {
        const c = crs.find((x) => x.id === id);
        return c ? c.code : id;
      });
      return `${noms.length} CR : ${noms.join(', ')}`;
    }
    return '?';
  }

  function iconeCible(t: CiblePerimetreType): JSX.Element {
    if (t === 'STRUCTURE') return <Briefcase className="h-3.5 w-3.5" />;
    if (t === 'CR') return <Target className="h-3.5 w-3.5" />;
    return <Grid3x3 className="h-3.5 w-3.5" />;
  }

  function toggleCrInSet(id: string): void {
    setCibleCrIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="!max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gérer les périmètres de {userLibelle}</DialogTitle>
          <DialogDescription>
            Ajoutez ou retirez des affectations multi-périmètres pour cet
            utilisateur.
          </DialogDescription>
        </DialogHeader>

        {/* Liste existante */}
        <div className="space-y-2" data-testid="liste-affectations">
          <h4 className="text-sm font-semibold">Affectations actuelles</h4>
          {loading && (
            <p className="text-xs text-(--muted-foreground)">Chargement…</p>
          )}
          {!loading && affectations.length === 0 && (
            <p className="text-xs text-(--muted-foreground)">
              Aucune affectation pour cet utilisateur.
            </p>
          )}
          {affectations.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between rounded-md border border-(--border) p-2 text-sm"
              data-testid={`affectation-${a.id}`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center gap-1 rounded bg-(--muted) px-1.5 py-0.5 text-xs"
                  title={CIBLE_TYPE_LABEL[a.cibleType]}
                >
                  {iconeCible(a.cibleType)}
                  {a.cibleType}
                </span>
                <span className={a.actif ? '' : 'line-through opacity-50'}>
                  {libelleCible(a)}
                </span>
                <span className="text-[10px] text-(--muted-foreground)">
                  {a.dateDebut} → {a.dateFin ?? '∞'} · {a.origine}
                </span>
              </div>
              {a.actif && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRetirer(a.id)}
                  data-testid={`btn-retirer-${a.id}`}
                  aria-label="Retirer"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Formulaire ajout */}
        <div className="space-y-3 rounded-md border-2 border-dashed border-(--border) p-3">
          <h4 className="text-sm font-semibold">Ajouter une affectation</h4>
          <div className="space-y-1">
            <Label htmlFor="cible-type">Type de cible</Label>
            <Select
              value={cibleType || undefined}
              onValueChange={(v) => {
                setCibleType(v as CiblePerimetreType);
                setCibleId('');
                setCibleCrIds([]);
              }}
            >
              <SelectTrigger id="cible-type" data-testid="select-cible-type">
                <SelectValue placeholder="Choisir…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="STRUCTURE">Structure (descente arbre)</SelectItem>
                <SelectItem value="CR">CR unique</SelectItem>
                <SelectItem value="CR_SET">Ensemble de CR (≥ 2)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {cibleType === 'STRUCTURE' && (
            <div className="space-y-1">
              <Label htmlFor="cible-structure">Structure</Label>
              <Select value={cibleId || undefined} onValueChange={setCibleId}>
                <SelectTrigger id="cible-structure" data-testid="select-structure">
                  <SelectValue placeholder="Sélectionner une structure…" />
                </SelectTrigger>
                <SelectContent>
                  {structures.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.code} — {s.libelle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {cibleType === 'CR' && (
            <div className="space-y-1">
              <Label htmlFor="cible-cr">Centre de responsabilité</Label>
              <Select value={cibleId || undefined} onValueChange={setCibleId}>
                <SelectTrigger id="cible-cr" data-testid="select-cr">
                  <SelectValue placeholder="Sélectionner un CR…" />
                </SelectTrigger>
                <SelectContent>
                  {crs.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code} — {c.libelle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {cibleType === 'CR_SET' && (
            <div className="space-y-1">
              <Label>Ensemble de CR (cocher au moins 2)</Label>
              <div
                className="max-h-48 overflow-y-auto rounded-md border border-(--border) p-2 space-y-1"
                data-testid="cr-set-checkboxes"
              >
                {crs.map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={cibleCrIds.includes(c.id)}
                      onChange={() => toggleCrInSet(c.id)}
                      data-testid={`crset-${c.code}`}
                    />
                    <span>
                      {c.code} — {c.libelle}
                    </span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-(--muted-foreground)">
                {cibleCrIds.length} sélectionné{cibleCrIds.length > 1 ? 's' : ''}{' '}
                — minimum 2 requis.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="date-debut">Date de début</Label>
              <Input
                id="date-debut"
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                data-testid="input-date-debut"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="date-fin">Date de fin (optionnel)</Label>
              <Input
                id="date-fin"
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
                data-testid="input-date-fin"
              />
            </div>
          </div>
          {dateError && (
            <p className="text-xs text-red-600" role="alert">
              {dateError}
            </p>
          )}

          <div className="space-y-1">
            <Label htmlFor="motif">Motif (optionnel)</Label>
            <textarea
              id="motif"
              rows={2}
              maxLength={2000}
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              className="w-full rounded-md border border-(--input) bg-(--background) px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--ring) resize-y"
              data-testid="input-motif"
            />
          </div>

          <Button
            onClick={handleAjouter}
            disabled={!peutAjouter || submitting}
            data-testid="btn-ajouter"
          >
            Ajouter
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-1" /> Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
