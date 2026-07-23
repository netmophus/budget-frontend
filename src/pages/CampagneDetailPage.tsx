/**
 * CampagneDetailPage (Lot 8.2.A) — détail d'une campagne budgétaire.
 *
 * 2 onglets via `Tabs` custom maison (Lot 5.3.B — pas le pattern
 * shadcn Radix standard) :
 *   - "Comité Budgétaire" (actif par défaut) : tableau des membres,
 *     bouton "Ajouter un membre" si statut PARAMETRAGE + perm.
 *   - "Documents associés" : placeholder Lot 8.2.B.
 *
 * Bouton "Lancer la campagne" en haut à droite :
 *   - Masqué si statut !== PARAMETRAGE (workflow déjà engagé, pas de
 *     retour en arrière possible → masquage cohérent VersionsPage).
 *   - Désactivé + tooltip si perm absente OU comité sans membre
 *     obligatoire (conditions transitoires → patron "bouton inactif
 *     explicatif" plutôt que masquage total).
 *   - ConfirmDialog destructive avec message irréversible.
 *
 * Suppression de membre : endpoint backend pas encore livré (Lot 8.2.x
 * futur). Mention pédagogique dans l'onglet plutôt qu'un bouton gris
 * sans action — moins prêteur à confusion.
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { AxiosError } from 'axios';
import {
  AlertCircle,
  ArrowLeft,
  FileSignature,
  Layers,
  Send,
  UserPlus,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';

import { ConfirmDialog } from '@/components/common/ConfirmDialog';
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
import { Tabs } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ajouterMembreCampagne,
  type AjouterMembreDto,
  type CampagneDetail,
  detailCampagne,
  lancerCampagne,
} from '@/lib/api/campagnes';
import type { UserResponse } from '@/lib/api/types';
import { listUsers } from '@/lib/api/users';
import { useHasPermission } from '@/lib/auth/permissions';
import type { ComiteMembre } from '@/types/campagne';

import { StatutCampagneBadge } from './CampagnesPage';

const STATUT_LANCABLE = 'PARAMETRAGE';

export function CampagneDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canGerer = useHasPermission('CAMPAGNE.GERER');

  const [campagne, setCampagne] = useState<CampagneDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [ajouterOpen, setAjouterOpen] = useState(false);
  const [lancerOpen, setLancerOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    detailCampagne(id)
      .then(setCampagne)
      .catch(() => toast.error('Impossible de charger la campagne'))
      .finally(() => setLoading(false));
  }, [id, refreshKey]);

  async function handleLancer() {
    if (!campagne) return;
    try {
      const updated = await lancerCampagne(campagne.id);
      toast.success(`Campagne ${updated.code} lancée.`);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      const message = extractApiMessage(err);
      // Re-throw pour que ConfirmDialog garde le dialog ouvert
      // (cf. ConfirmDialog.tsx : si onConfirm throw, dialog reste ouvert).
      toast.error(message || 'Impossible de lancer la campagne.');
      throw err;
    }
  }

  if (loading || !campagne) {
    return (
      <div className="text-sm text-(--muted-foreground) p-4">
        Chargement…
      </div>
    );
  }

  const nbMembresOblig = campagne.comiteMembres.filter(
    (m) => m.estObligatoire,
  ).length;
  const peutEditerComite =
    canGerer && campagne.statut === STATUT_LANCABLE;
  const peutLancer = peutEditerComite && nbMembresOblig >= 1;

  const raisonBloqueLancement = !canGerer
    ? 'Permission CAMPAGNE.GERER requise.'
    : nbMembresOblig < 1
      ? 'Le Comité doit comporter au moins 1 membre obligatoire avant lancement.'
      : '';

  const lancerBtn = (
    <Button
      disabled={!peutLancer}
      onClick={() => setLancerOpen(true)}
      data-testid="btn-lancer-campagne"
      className={
        peutLancer
          ? 'h-9 px-3.5 bg-(--miznas-bleu-nuit-dark) hover:bg-(--miznas-bleu-nuit-dark)/90 text-white gap-1.5'
          : 'h-9 px-3.5 gap-1.5'
      }
    >
      <Send className="w-3.5 h-3.5" />
      Lancer la campagne
    </Button>
  );

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate('/campagnes')}
        className="inline-flex items-center gap-1 text-xs text-(--muted-foreground) hover:text-(--foreground) mb-4"
      >
        <ArrowLeft className="w-3 h-3" />
        Retour aux campagnes
      </button>

      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3">
          <div
            style={{ backgroundColor: '#0C447C1A' }}
            className="w-10 h-10 rounded-md flex items-center justify-center"
            aria-hidden="true"
          >
            <FileSignature
              className="w-5 h-5"
              style={{ color: '#0C447C' }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-2xl font-semibold tracking-tight m-0 font-mono">
                {campagne.code}
              </h3>
              <StatutCampagneBadge statut={campagne.statut} />
            </div>
            <p className="text-sm text-(--muted-foreground) mt-0.5">
              Exercice {campagne.exerciceFiscal} — {campagne.libelle}
            </p>
          </div>
        </div>

        {campagne.statut === STATUT_LANCABLE &&
          (raisonBloqueLancement ? (
            <Tooltip>
              <TooltipTrigger asChild>
                {/* Span wrapper indispensable : un Button disabled ne
                    déclenche pas les events hover/focus → tooltip
                    invisible sans ce wrapper (pattern Radix connu). */}
                <span tabIndex={0}>{lancerBtn}</span>
              </TooltipTrigger>
              <TooltipContent>{raisonBloqueLancement}</TooltipContent>
            </Tooltip>
          ) : (
            lancerBtn
          ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <InfoCell
          label="Signataire par défaut"
          value={
            campagne.signataireDefaut
              ? `${campagne.signataireDefaut.prenom} ${campagne.signataireDefaut.nom} (${campagne.signataireDefaut.email})`
              : '—'
          }
        />
        <InfoCell
          label="Mode visa par défaut"
          value={campagne.modeVisaDefaut}
        />
        <InfoCell
          label="Créée par"
          value={campagne.utilisateurCreation}
        />
      </div>

      <Tabs
        tabs={[
          {
            value: 'comite',
            label: (
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" /> Comité budgétaire
              </span>
            ),
            content: (
              <OngletComite
                membres={campagne.comiteMembres}
                peutEditer={peutEditerComite}
                onAddClick={() => setAjouterOpen(true)}
              />
            ),
          },
          {
            value: 'documents',
            label: (
              <span className="flex items-center gap-1.5">
                <FileSignature className="w-3.5 h-3.5" /> Documents associés
              </span>
            ),
            content: <OngletDocumentsPlaceholder />,
          },
        ]}
        defaultValue="comite"
      />

      <AjouterMembreModal
        open={ajouterOpen}
        onClose={() => setAjouterOpen(false)}
        campagneId={campagne.id}
        excludedUserIds={campagne.comiteMembres.map((m) => m.fkUser)}
        onAdded={(membre) => {
          toast.success(
            membre.user
              ? `${membre.user.prenom} ${membre.user.nom} ajouté(e) au Comité.`
              : 'Membre ajouté au Comité.',
          );
          setAjouterOpen(false);
          setRefreshKey((k) => k + 1);
        }}
      />

      <ConfirmDialog
        isOpen={lancerOpen}
        onClose={() => setLancerOpen(false)}
        onConfirm={handleLancer}
        title={`Lancer la campagne ${campagne.code} ?`}
        description={
          <>
            <p>
              Cette action figera le Comité budgétaire : les membres ne
              pourront plus être ajoutés ni retirés.
            </p>
            <p className="mt-2">
              Le statut passera à <strong>EN_COURS</strong>.{' '}
              <strong>Action irréversible.</strong>
            </p>
          </>
        }
        confirmText="Lancer la campagne"
        cancelText="Annuler"
        destructive
      />
    </div>
  );
}

// ─── Sous-composants ────────────────────────────────────────────────

function InfoCell({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-(--border) bg-white p-3.5 shadow-sm">
      <div className="text-[10px] text-(--muted-foreground) uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className="text-[13px] break-words">{value}</div>
    </div>
  );
}

function OngletComite({
  membres,
  peutEditer,
  onAddClick,
}: {
  membres: ComiteMembre[];
  peutEditer: boolean;
  onAddClick: () => void;
}) {
  const sorted = [...membres].sort((a, b) => a.ordre - b.ordre);

  return (
    <div>
      {peutEditer && (
        <div className="flex justify-end mb-3">
          <Button
            onClick={onAddClick}
            data-testid="btn-ajouter-membre"
            className="h-8 px-3 bg-(--miznas-bleu-nuit-dark) hover:bg-(--miznas-bleu-nuit-dark)/90 text-white gap-1.5 text-xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Ajouter un membre
          </Button>
        </div>
      )}

      <div
        className="bg-white border border-(--border) rounded-xl overflow-hidden shadow-sm"
        data-testid="comite-table"
      >
        <div className="grid grid-cols-[60px_1fr_280px_1fr_120px] bg-(--secondary) px-4 py-3 border-b border-(--border)">
          <ColH>Ordre</ColH>
          <ColH>Nom</ColH>
          <ColH>Email</ColH>
          <ColH>Fonction</ColH>
          <ColH>Obligatoire</ColH>
        </div>

        {sorted.length === 0 && (
          <div className="px-4 py-10 text-sm text-(--muted-foreground) text-center">
            Aucun membre dans le Comité.
            {peutEditer && ' Cliquez sur « Ajouter un membre » ci-dessus.'}
          </div>
        )}

        {sorted.map((m) => (
          <div
            key={m.id}
            data-testid={`membre-row-${m.id}`}
            className="grid grid-cols-[60px_1fr_280px_1fr_120px] px-4 py-3 items-center border-b border-(--border) last:border-b-0 hover:bg-(--muted)/30 transition-colors"
          >
            <div className="text-[13px] tabular-nums font-medium">
              {m.ordre}
            </div>
            <div className="text-[13px]">
              {m.user ? `${m.user.prenom} ${m.user.nom}` : '—'}
            </div>
            <div className="text-[13px] text-(--muted-foreground)">
              {m.user?.email ?? '—'}
            </div>
            <div className="text-[13px]">{m.libelleFonction ?? '—'}</div>
            <div className="text-[13px]">
              {m.estObligatoire ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium w-fit bg-(--miznas-cat-validation)/10 text-(--miznas-cat-validation)">
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-(--miznas-cat-validation)"
                    aria-hidden="true"
                  />
                  Obligatoire
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium w-fit bg-(--muted) text-(--muted-foreground)">
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-(--muted-foreground)"
                    aria-hidden="true"
                  />
                  Consultatif
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {peutEditer && (
        <p className="text-xs text-(--muted-foreground) mt-3 flex items-start gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            La suppression d'un membre sera disponible dans un palier
            futur (Lot 8.2.x). Pour l'instant, seul l'ajout est exposé.
          </span>
        </p>
      )}
    </div>
  );
}

function OngletDocumentsPlaceholder() {
  return (
    <div className="bg-white border border-(--border) rounded-xl p-10 text-center text-sm text-(--muted-foreground) shadow-sm">
      Les documents officiels (lettre cadrage, notes, PV) seront
      disponibles après la livraison du Lot 8.2.B.
    </div>
  );
}

function ColH({ children }: { children: ReactNode }) {
  return (
    <div className="text-[11px] font-semibold text-(--muted-foreground) uppercase tracking-wider">
      {children}
    </div>
  );
}

// ─── AjouterMembreModal ─────────────────────────────────────────────

const ajouterMembreSchema = z.object({
  fkUser: z.string().min(1, 'Utilisateur requis'),
  libelleFonction: z
    .string()
    .max(255, 'Max 255 caractères')
    .optional(),
  estObligatoire: z.boolean(),
});

type AjouterMembreFormValues = z.infer<typeof ajouterMembreSchema>;

interface AjouterMembreModalProps {
  open: boolean;
  onClose: () => void;
  campagneId: string;
  excludedUserIds: string[];
  onAdded: (membre: ComiteMembre) => void;
}

function AjouterMembreModal({
  open,
  onClose,
  campagneId,
  excludedUserIds,
  onAdded,
}: AjouterMembreModalProps) {
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AjouterMembreFormValues>({
    resolver: zodResolver(ajouterMembreSchema),
    defaultValues: {
      fkUser: '',
      libelleFonction: '',
      estObligatoire: true,
    },
  });

  useEffect(() => {
    if (!open) return;
    listUsers({ limit: 100, estActif: true })
      .then((r) =>
        setUsers(r.items.filter((u) => !excludedUserIds.includes(u.id))),
      )
      .catch(() =>
        toast.error('Impossible de charger la liste des utilisateurs'),
      );
  }, [open, excludedUserIds]);

  function close() {
    onClose();
    reset();
  }

  async function onSubmit(values: AjouterMembreFormValues) {
    setSubmitting(true);
    try {
      const dto: AjouterMembreDto = {
        fkUser: values.fkUser,
        libelleFonction: values.libelleFonction || undefined,
        estObligatoire: values.estObligatoire,
      };
      const created = await ajouterMembreCampagne(campagneId, dto);
      onAdded(created);
      reset();
    } catch (err) {
      const message = extractApiMessage(err);
      toast.error(message || 'Ajout refusé.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !submitting) close();
      }}
    >
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Ajouter un membre au Comité</DialogTitle>
          <DialogDescription>
            Le membre pourra apposer un visa sur les documents officiels
            soumis dans le cadre de cette campagne.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          data-testid="form-ajouter-membre"
        >
          <div>
            <Label htmlFor="membre-user">Utilisateur</Label>
            <Controller
              control={control}
              name="fkUser"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger
                    id="membre-user"
                    className="mt-1"
                    data-testid="select-user"
                  >
                    <SelectValue placeholder="Choisir un utilisateur" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.prenom} {u.nom} ({u.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.fkUser && (
              <p className="text-xs text-(--destructive) mt-1">
                {errors.fkUser.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="membre-fonction">
              Libellé de la fonction{' '}
              <span className="text-(--muted-foreground)">
                (optionnel)
              </span>
            </Label>
            <Input
              id="membre-fonction"
              {...register('libelleFonction')}
              placeholder="Ex: DGA Opérations, Direction Audit…"
              className="mt-1"
            />
          </div>

          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="membre-obligatoire"
              {...register('estObligatoire')}
              data-testid="checkbox-obligatoire"
              className="mt-1 h-4 w-4 rounded border-(--border)"
            />
            <div>
              <Label htmlFor="membre-obligatoire" className="font-normal">
                Visa obligatoire
              </Label>
              <p className="text-xs text-(--muted-foreground) mt-1">
                Si décoché, le visa de ce membre est consultatif et
                n'empêche pas la transition VISE.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={close}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              data-testid="btn-submit-ajouter-membre"
              className="bg-(--miznas-bleu-nuit-dark) hover:bg-(--miznas-bleu-nuit-dark)/90 text-white"
            >
              {submitting ? 'Ajout…' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function extractApiMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const dataMsg = (
      err.response?.data as { message?: string | string[] } | undefined
    )?.message;
    if (Array.isArray(dataMsg)) return dataMsg.join(' ; ');
    if (typeof dataMsg === 'string') return dataMsg;
    return err.message;
  }
  return err instanceof Error ? err.message : 'Erreur';
}
