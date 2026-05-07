/**
 * Dialogue de création / modification d'une ligne de réalisé
 * (Lot 5.1.B). Validation client : compte/ligne_metier/mois/
 * devise/montant > 0. Mode par défaut MNT. Refresh grille au
 * succès via callback `onSaved`.
 *
 * Mutualisé pour création (mode='create') et modification
 * (mode='edit', `editing` fourni). En modification : montant /
 * mode / commentaire éditables — les FK dimensions sont figées
 * (le backend rejette de toute façon : la modif sur statut=
 * IMPORTE ne change que les champs métier, pas les dimensions
 * qui forment la clé d'unicité).
 */
import { AxiosError } from 'axios';
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
  type FaitRealise,
  type ModeFaitRealise,
  creerRealise,
  modifierRealise,
} from '@/lib/api/realise';
import {
  type Compte,
  type Devise,
  type LigneMetier,
  listComptes,
  listDevises,
  listLignesMetier,
} from '@/lib/api/referentiels';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** mode 'create' = nouvelle, 'edit' = modification d'`editing`. */
  mode: 'create' | 'edit';
  /** Si fourni : préremplit en mode 'edit'. */
  editing?: FaitRealise | null;
  /** Contexte de la grille (CR, période). Utilisé en mode create. */
  crId: string;
  moisDebut: string; // YYYY-MM
  moisFin: string; // YYYY-MM
  /** Devise par défaut sélectionnée dans le sélecteur de page. */
  fkDeviseDefaut: string | null;
  /** Charges auxiliaires pour résoudre fk_temps depuis YYYY-MM. */
  resolveFkTemps: (mois: string) => Promise<string | null>;
  onSaved: () => void;
}

function parseError(err: unknown): { msg: string; status?: number } {
  if (err instanceof AxiosError) {
    const data = err.response?.data as { message?: string | string[] } | undefined;
    const msg = Array.isArray(data?.message)
      ? data!.message.join(' ; ')
      : (data?.message ?? err.message);
    return { msg, status: err.response?.status };
  }
  return { msg: err instanceof Error ? err.message : 'Erreur' };
}

function moisDansPeriode(mois: string, debut: string, fin: string): boolean {
  return mois >= debut && mois <= fin;
}

export function CreerModifierLigneRealiseDialog({
  isOpen,
  onClose,
  mode,
  editing,
  crId,
  moisDebut,
  moisFin,
  fkDeviseDefaut,
  resolveFkTemps,
  onSaved,
}: Props): JSX.Element {
  const [comptes, setComptes] = useState<Compte[]>([]);
  const [lignesMetier, setLignesMetier] = useState<LigneMetier[]>([]);
  const [devises, setDevises] = useState<Devise[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [fkCompte, setFkCompte] = useState('');
  const [fkLigneMetier, setFkLigneMetier] = useState('');
  const [mois, setMois] = useState(moisDebut);
  const [fkDevise, setFkDevise] = useState('');
  const [montant, setMontant] = useState('');
  const [modeChamp, setModeChamp] = useState<ModeFaitRealise>('MNT');
  const [commentaire, setCommentaire] = useState('');

  // Charge les référentiels à l'ouverture
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    Promise.all([
      listComptes({ versionCouranteUniquement: true, limit: 200 }),
      listLignesMetier({ versionCouranteUniquement: true, limit: 200 }),
      listDevises({ estActive: true }),
    ])
      .then(([c, l, d]) => {
        setComptes(c.items);
        setLignesMetier(l.items);
        setDevises(d.items);
      })
      .catch(() => toast.error('Impossible de charger les référentiels.'))
      .finally(() => setLoading(false));
  }, [isOpen]);

  // Pré-remplissage en mode édit
  useEffect(() => {
    if (!isOpen) return;
    if (mode === 'edit' && editing) {
      setFkCompte(editing.fkCompte);
      setFkLigneMetier(editing.fkLigneMetier);
      setFkDevise(editing.fkDevise);
      setMontant(String(editing.montant));
      setModeChamp(editing.mode);
      setCommentaire(editing.commentaire ?? '');
      // Le mois est non éditable en modif (clé d'unicité backend)
    } else if (mode === 'create') {
      setFkCompte('');
      setFkLigneMetier('');
      setFkDevise(fkDeviseDefaut ?? '');
      setMontant('');
      setModeChamp('MNT');
      setCommentaire('');
      setMois(moisDebut);
    }
  }, [isOpen, mode, editing, fkDeviseDefaut, moisDebut]);

  const moisInvalide =
    mode === 'create' &&
    (mois < moisDebut || mois > moisFin || !/^\d{4}-\d{2}$/.test(mois));

  const peutEnregistrer = useMemo(() => {
    if (mode === 'edit') {
      return Number(montant) > 0;
    }
    return (
      fkCompte.length > 0 &&
      fkLigneMetier.length > 0 &&
      fkDevise.length > 0 &&
      Number(montant) > 0 &&
      moisDansPeriode(mois, moisDebut, moisFin)
    );
  }, [
    mode,
    fkCompte,
    fkLigneMetier,
    fkDevise,
    montant,
    mois,
    moisDebut,
    moisFin,
  ]);

  async function handleSubmit(): Promise<void> {
    if (!peutEnregistrer) return;
    setSubmitting(true);
    try {
      if (mode === 'edit' && editing) {
        await modifierRealise(editing.id, {
          montant: Number(montant),
          mode: modeChamp,
          commentaire: commentaire.trim() || undefined,
        });
        toast.success('Ligne modifiée.');
      } else {
        const fkTemps = await resolveFkTemps(mois);
        if (!fkTemps) {
          toast.error(
            `Mois ${mois} introuvable dans dim_temps. Contactez un administrateur.`,
          );
          setSubmitting(false);
          return;
        }
        await creerRealise({
          fkCentreResponsabilite: crId,
          fkCompte,
          fkLigneMetier,
          fkTemps,
          fkDevise,
          montant: Number(montant),
          mode: modeChamp,
          commentaire: commentaire.trim() || undefined,
        });
        toast.success('Ligne créée.');
      }
      onSaved();
      onClose();
    } catch (err) {
      const { msg, status } = parseError(err);
      if (status === 409) {
        toast.error(
          `Une ligne existe déjà pour ce CR / compte / ligne métier / mois. Utilisez Modifier.`,
        );
      } else if (status === 403) {
        toast.error(`${msg} (vous n'avez pas accès à ce CR en écriture).`);
      } else {
        toast.error(`Échec : ${msg}`);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="!max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create'
              ? 'Nouvelle ligne réalisé'
              : 'Modifier la ligne'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Saisie manuelle (statut initial : Importé). Le mois doit être dans la période affichée.'
              : 'Modification possible uniquement tant que la ligne est en statut Importé.'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-(--muted-foreground)">Chargement…</p>
        ) : (
          <div className="space-y-3">
            {mode === 'create' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="r-compte">Compte *</Label>
                    <Select
                      value={fkCompte || undefined}
                      onValueChange={setFkCompte}
                    >
                      <SelectTrigger
                        id="r-compte"
                        data-testid="r-compte"
                      >
                        <SelectValue placeholder="Sélectionner…" />
                      </SelectTrigger>
                      <SelectContent>
                        {comptes
                          .filter((c) => !c.estCompteCollectif)
                          .map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.codeCompte} — {c.libelle}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="r-lm">Ligne métier *</Label>
                    <Select
                      value={fkLigneMetier || undefined}
                      onValueChange={setFkLigneMetier}
                    >
                      <SelectTrigger
                        id="r-lm"
                        data-testid="r-lignemetier"
                      >
                        <SelectValue placeholder="Sélectionner…" />
                      </SelectTrigger>
                      <SelectContent>
                        {lignesMetier.map((l) => (
                          <SelectItem key={l.id} value={l.id}>
                            {l.codeLigneMetier} — {l.libelle}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="r-mois">Mois (YYYY-MM) *</Label>
                    <Input
                      id="r-mois"
                      data-testid="r-mois"
                      type="month"
                      value={mois}
                      min={moisDebut}
                      max={moisFin}
                      onChange={(e) => setMois(e.target.value)}
                    />
                    {moisInvalide && (
                      <p className="text-xs text-red-500 mt-1">
                        Hors de la période affichée ({moisDebut} → {moisFin}).
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="r-devise">Devise *</Label>
                    <Select
                      value={fkDevise || undefined}
                      onValueChange={setFkDevise}
                    >
                      <SelectTrigger
                        id="r-devise"
                        data-testid="r-devise"
                      >
                        <SelectValue placeholder="Sélectionner…" />
                      </SelectTrigger>
                      <SelectContent>
                        {devises.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.codeIso} — {d.libelle}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="r-montant">Montant *</Label>
                <Input
                  id="r-montant"
                  data-testid="r-montant"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={montant}
                  onChange={(e) => setMontant(e.target.value)}
                  placeholder="ex. 1500000"
                />
              </div>
              <div>
                <Label>Mode *</Label>
                <div className="flex gap-3 mt-2" data-testid="r-mode">
                  {(['MNT', 'VOL', 'UNIT'] as const).map((m) => (
                    <label
                      key={m}
                      className="flex items-center gap-1 text-sm cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="mode-realise"
                        checked={modeChamp === m}
                        onChange={() => setModeChamp(m)}
                      />
                      {m}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="r-comm">Commentaire</Label>
              <textarea
                id="r-comm"
                data-testid="r-commentaire"
                rows={2}
                className="w-full rounded-md border border-(--border) bg-(--background) p-2 text-sm"
                value={commentaire}
                onChange={(e) => setCommentaire(e.target.value)}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!peutEnregistrer || submitting}
            data-testid="btn-enregistrer-realise"
          >
            {submitting ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
