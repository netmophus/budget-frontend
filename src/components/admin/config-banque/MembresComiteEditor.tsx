/**
 * MembresComiteEditor (Lot B4) — gestion des membres du Comité Budgétaire :
 * tableau ordonné + ajout / modification / désactivation + réordonnancement
 * par boutons haut/bas. Chaque action est immédiate (appel API) puis notifie
 * le parent via `onChanged` pour recharger la configuration.
 */
import { useState } from 'react';
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import {
  createMembreComite,
  deleteMembreComite,
  updateMembreComite,
  FONCTIONS_COMITE,
  FONCTION_COMITE_LABEL,
  type FonctionComite,
  type MembreComite,
} from '@/lib/api/configurationBanque';

interface MembresComiteEditorProps {
  membres: MembreComite[];
  onChanged: () => void | Promise<void>;
}

export function MembresComiteEditor({
  membres,
  onChanged,
}: MembresComiteEditorProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [edited, setEdited] = useState<MembreComite | null>(null);
  const [toDelete, setToDelete] = useState<MembreComite | null>(null);
  const [busy, setBusy] = useState(false);

  // Ordonné par ordre_affichage (le backend renvoie déjà trié, on sécurise).
  const ordered = [...membres].sort(
    (a, b) => a.ordreAffichage - b.ordreAffichage,
  );

  async function move(index: number, dir: -1 | 1): Promise<void> {
    const target = ordered[index + dir];
    const current = ordered[index];
    if (!target || busy) return;
    setBusy(true);
    try {
      // Échange les ordres d'affichage des deux voisins.
      await updateMembreComite(current.id, {
        ordreAffichage: target.ordreAffichage,
      });
      await updateMembreComite(target.id, {
        ordreAffichage: current.ordreAffichage,
      });
      await onChanged();
    } catch {
      toast.error('Réordonnancement impossible.');
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete(): Promise<void> {
    if (!toDelete) return;
    await deleteMembreComite(toDelete.id);
    toast.success(`Membre « ${toDelete.nomPrenom} » retiré.`);
    setToDelete(null);
    await onChanged();
  }

  return (
    <div className="space-y-3" data-testid="membres-comite-editor">
      <div className="flex items-center justify-between">
        <p className="text-sm text-(--muted-foreground)">
          {ordered.length} membre(s) actif(s) du Comité Budgétaire.
        </p>
        <Button
          type="button"
          size="sm"
          data-testid="btn-ajouter-membre"
          onClick={() => {
            setEdited(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-1 h-4 w-4" /> Ajouter un membre
        </Button>
      </div>

      <div className="rounded-md border border-(--border)">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Ordre</TableHead>
              <TableHead>Nom et prénom</TableHead>
              <TableHead>Fonction</TableHead>
              <TableHead className="w-40 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordered.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="text-center text-sm text-(--muted-foreground)"
                >
                  Aucun membre. Cliquez sur « Ajouter un membre ».
                </TableCell>
              </TableRow>
            )}
            {ordered.map((m, i) => (
              <TableRow key={m.id} data-testid={`membre-row-${m.id}`}>
                <TableCell>{m.ordreAffichage}</TableCell>
                <TableCell className="font-medium">
                  {m.titre ? `${m.titre} ` : ''}
                  {m.nomPrenom}
                </TableCell>
                <TableCell>{FONCTION_COMITE_LABEL[m.fonction]}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={i === 0 || busy}
                      aria-label="Monter"
                      data-testid={`membre-up-${m.id}`}
                      onClick={() => void move(i, -1)}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      disabled={i === ordered.length - 1 || busy}
                      aria-label="Descendre"
                      data-testid={`membre-down-${m.id}`}
                      onClick={() => void move(i, 1)}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      aria-label="Modifier"
                      data-testid={`membre-edit-${m.id}`}
                      onClick={() => {
                        setEdited(m);
                        setDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-(--destructive)"
                      aria-label="Supprimer"
                      data-testid={`membre-delete-${m.id}`}
                      onClick={() => setToDelete(m)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {dialogOpen && (
        <MembreDialog
          membre={edited}
          nbMembres={ordered.length}
          onClose={() => setDialogOpen(false)}
          onSaved={async () => {
            setDialogOpen(false);
            await onChanged();
          }}
        />
      )}

      <ConfirmDialog
        isOpen={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        title="Retirer ce membre ?"
        description={
          toDelete
            ? `Le membre « ${toDelete.nomPrenom} » sera désactivé (désactivation logique, traçée).`
            : ''
        }
        confirmText="Retirer"
        destructive
      />
    </div>
  );
}

// ─── Dialog Ajouter / Modifier un membre ─────────────────────────────

interface MembreDialogProps {
  membre: MembreComite | null;
  nbMembres: number;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}

function MembreDialog({ membre, nbMembres, onClose, onSaved }: MembreDialogProps) {
  const isEdit = membre !== null;
  const [nomPrenom, setNomPrenom] = useState(membre?.nomPrenom ?? '');
  const [titre, setTitre] = useState(membre?.titre ?? '');
  const [fonction, setFonction] = useState<FonctionComite>(
    membre?.fonction ?? 'MEMBRE',
  );
  const [saving, setSaving] = useState(false);

  const nomValide = nomPrenom.trim().length > 0;

  async function handleSubmit(): Promise<void> {
    if (!nomValide || saving) return;
    setSaving(true);
    try {
      if (isEdit && membre) {
        await updateMembreComite(membre.id, {
          nomPrenom: nomPrenom.trim(),
          titre: titre.trim(),
          fonction,
        });
        toast.success('Membre modifié.');
      } else {
        await createMembreComite({
          nomPrenom: nomPrenom.trim(),
          titre: titre.trim() || undefined,
          fonction,
          ordreAffichage: nbMembres + 1,
        });
        toast.success('Membre ajouté.');
      }
      await onSaved();
    } catch {
      toast.error('Enregistrement du membre impossible.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent data-testid="membre-dialog">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Modifier le membre' : 'Ajouter un membre'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="m-nom">Nom et prénom *</Label>
            <Input
              id="m-nom"
              data-testid="m-nom"
              value={nomPrenom}
              onChange={(e) => setNomPrenom(e.target.value)}
            />
            {nomPrenom.length > 0 && !nomValide && (
              <p className="mt-1 text-xs text-red-500">Nom obligatoire.</p>
            )}
          </div>
          <div>
            <Label htmlFor="m-titre">Titre (M., Mme…)</Label>
            <Input
              id="m-titre"
              data-testid="m-titre"
              value={titre}
              maxLength={20}
              onChange={(e) => setTitre(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="m-fonction">Fonction</Label>
            <Select
              value={fonction}
              onValueChange={(v) => setFonction(v as FonctionComite)}
            >
              <SelectTrigger id="m-fonction" data-testid="m-fonction">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONCTIONS_COMITE.map((f) => (
                  <SelectItem key={f} value={f}>
                    {FONCTION_COMITE_LABEL[f]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button
            data-testid="m-submit"
            disabled={!nomValide || saving}
            onClick={() => void handleSubmit()}
          >
            {saving ? '…' : isEdit ? 'Enregistrer' : 'Ajouter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
