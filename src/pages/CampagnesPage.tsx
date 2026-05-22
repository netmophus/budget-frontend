/**
 * CampagnesPage (Lot 8.2.A) — liste des campagnes budgétaires.
 *
 * Une campagne = un cycle annuel de production des documents officiels
 * (lettre cadrage, notes, PV, etc.) avec workflow visa / signature.
 * Volume cible : ~10 campagnes max sur la durée de vie MIZNAS — donc
 * pas de pagination, pas de filtres complexes (YAGNI acté Lot 8.1.C).
 *
 * Pattern aligné sur VersionsPage : header custom + tableau grid CSS +
 * badges colorés par statut. Réutilise les briques existantes du
 * projet (useHasPermission, apiClient via lib/api/campagnes, toast
 * sonner, shadcn Dialog/Select). Pas de framework de form pour le
 * tableau (state simple), zod+react-hook-form uniquement pour la
 * modale de création (aligné LoginPage / ResetPasswordPage).
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { AxiosError } from 'axios';
import {
  ClipboardList,
  FileSignature,
  Lock,
  Plus,
  Send,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';

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
  creerCampagne,
  type CreerCampagneDto,
  listerCampagnes,
} from '@/lib/api/campagnes';
import type { UserResponse } from '@/lib/api/types';
import { listUsers } from '@/lib/api/users';
import { useHasPermission } from '@/lib/auth/permissions';
import type {
  Campagne,
  StatutCampagne,
} from '@/types/campagne';

const STATUT_CAMPAGNE_LABEL: Record<StatutCampagne, string> = {
  PARAMETRAGE: 'Paramétrage',
  EN_COURS: 'En cours',
  TERMINEE: 'Terminée',
  ARCHIVEE: 'Archivée',
};

const STATUT_CAMPAGNE_CONFIG: Record<
  StatutCampagne,
  { hex: string; bgHex: string; Icon: LucideIcon }
> = {
  PARAMETRAGE: { hex: '#5F6B7A', bgHex: '#5F6B7A1A', Icon: ClipboardList },
  EN_COURS: { hex: '#2E5BAE', bgHex: '#2E5BAE1A', Icon: Send },
  TERMINEE: { hex: '#0F6E56', bgHex: '#0F6E561A', Icon: FileSignature },
  ARCHIVEE: { hex: '#5F6B7A', bgHex: '#5F6B7A1A', Icon: Lock },
};

export function StatutCampagneBadge({
  statut,
}: {
  statut: StatutCampagne;
}) {
  const cfg = STATUT_CAMPAGNE_CONFIG[statut];
  const Icon = cfg.Icon;
  return (
    <span
      data-testid={`statut-camp-badge-${statut}`}
      style={{ backgroundColor: cfg.bgHex, color: cfg.hex }}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold w-fit"
    >
      <Icon className="w-3 h-3" aria-hidden="true" />
      {STATUT_CAMPAGNE_LABEL[statut]}
    </span>
  );
}

export function CampagnesPage() {
  const navigate = useNavigate();
  const canGerer = useHasPermission('CAMPAGNE.GERER');

  const [data, setData] = useState<Campagne[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    listerCampagnes()
      .then((rows) => {
        const sorted = [...rows].sort((a, b) => {
          if (a.exerciceFiscal !== b.exerciceFiscal) {
            return b.exerciceFiscal - a.exerciceFiscal;
          }
          return b.dateCreation.localeCompare(a.dateCreation);
        });
        setData(sorted);
      })
      .catch(() => toast.error('Impossible de charger les campagnes'))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const anneeProchaine = new Date().getFullYear() + 1;

  return (
    <div>
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
            <h3 className="text-[19px] font-semibold tracking-tight m-0">
              Campagnes budgétaires
            </h3>
            <p className="text-xs text-(--muted-foreground) mt-0.5">
              Cycles annuels — lettre cadrage, notes, PV, workflow visa /
              signature
            </p>
          </div>
        </div>

        {canGerer && (
          <Button
            onClick={() => setModalOpen(true)}
            data-testid="btn-creer-campagne"
            className="h-9 px-3.5 bg-(--miznas-bleu-nuit-dark) hover:bg-(--miznas-bleu-nuit-dark)/90 text-white gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Créer une campagne {anneeProchaine}
          </Button>
        )}
      </div>

      <div
        className="bg-white border border-(--border) rounded-md overflow-hidden"
        data-testid="camp-table"
      >
        <div className="grid grid-cols-[220px_90px_1fr_140px_220px_90px] bg-(--secondary) px-4 py-3 border-b border-(--border)">
          <ColumnHeader>Code</ColumnHeader>
          <ColumnHeader>Exercice</ColumnHeader>
          <ColumnHeader>Libellé</ColumnHeader>
          <ColumnHeader>Statut</ColumnHeader>
          <ColumnHeader>Signataire</ColumnHeader>
          <ColumnHeader>Membres</ColumnHeader>
        </div>

        {loading && (
          <div className="px-4 py-6 text-sm text-(--muted-foreground)">
            Chargement…
          </div>
        )}
        {!loading && data.length === 0 && (
          <div className="px-4 py-10 text-sm text-(--muted-foreground) text-center">
            Aucune campagne créée. Cliquez sur « Créer » pour démarrer
            un nouvel exercice budgétaire.
          </div>
        )}
        {!loading &&
          data.map((c) => (
            <div
              key={c.id}
              data-testid={`camp-row-${c.id}`}
              onClick={() => navigate(`/campagnes/${c.id}`)}
              className="grid grid-cols-[220px_90px_1fr_140px_220px_90px] px-4 py-3 items-center border-b border-(--border) last:border-b-0 hover:bg-(--muted)/30 transition-colors cursor-pointer"
            >
              <div
                className="font-mono text-xs truncate pr-2"
                title={c.code}
              >
                {c.code}
              </div>
              <div className="text-[13px] tabular-nums font-medium">
                {c.exerciceFiscal}
              </div>
              <div className="text-[13px] truncate pr-2">{c.libelle}</div>
              <div>
                <StatutCampagneBadge statut={c.statut} />
              </div>
              <div className="text-[13px] truncate pr-2">
                {c.signataireDefaut
                  ? `${c.signataireDefaut.prenom} ${c.signataireDefaut.nom}`
                  : '—'}
              </div>
              <div className="text-[13px] tabular-nums">
                {c.nombreMembres ?? 0}
              </div>
            </div>
          ))}
      </div>

      <CreerCampagneModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(camp) => {
          toast.success(`Campagne ${camp.code} créée.`);
          setModalOpen(false);
          setRefreshKey((k) => k + 1);
        }}
      />
    </div>
  );
}

function ColumnHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold text-(--muted-foreground) uppercase tracking-wider">
      {children}
    </div>
  );
}

// ─── CreerCampagneModal ───────────────────────────────────────────────

const schema = z.object({
  code: z
    .string()
    .min(1, 'Code requis')
    .max(50, 'Max 50 caractères')
    .regex(
      /^[A-Z0-9_]+$/,
      'Lettres majuscules, chiffres et underscore uniquement',
    ),
  exerciceFiscal: z
    .number({ message: 'Exercice requis (entier entre 2024 et 2050)' })
    .int('Année entière')
    .min(2024, 'Exercice >= 2024')
    .max(2050, 'Exercice <= 2050'),
  libelle: z
    .string()
    .min(1, 'Libellé requis')
    .max(255, 'Max 255 caractères'),
  fkUserSignataireDefaut: z.string().min(1, 'Signataire requis'),
  modeVisaDefaut: z.enum(['PARALLELE', 'SEQUENTIEL']),
});

type FormValues = z.infer<typeof schema>;

interface CreerCampagneModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (campagne: Campagne) => void;
}

function CreerCampagneModal({
  open,
  onClose,
  onCreated,
}: CreerCampagneModalProps) {
  const anneeProchaine = new Date().getFullYear() + 1;
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: `CAMPAGNE_${anneeProchaine}`,
      exerciceFiscal: anneeProchaine,
      libelle: `Campagne budgétaire ${anneeProchaine}`,
      fkUserSignataireDefaut: '',
      modeVisaDefaut: 'PARALLELE',
    },
  });

  useEffect(() => {
    if (!open) return;
    // Pas d'endpoint dédié « users avec permission DOCUMENT.SIGNER » —
    // le DG choisit dans la liste des users actifs (~50 max chez BSIC,
    // pas de scaling à anticiper).
    listUsers({ limit: 100, estActif: true })
      .then((r) => setUsers(r.items))
      .catch(() =>
        toast.error('Impossible de charger la liste des utilisateurs'),
      );
  }, [open]);

  function close() {
    onClose();
    reset();
  }

  async function onSubmit(values: FormValues) {
    setSubmitting(true);
    try {
      const dto: CreerCampagneDto = {
        code: values.code,
        exerciceFiscal: values.exerciceFiscal,
        libelle: values.libelle,
        fkUserSignataireDefaut: values.fkUserSignataireDefaut,
        modeVisaDefaut: values.modeVisaDefaut,
      };
      const created = await creerCampagne(dto);
      onCreated(created);
      reset();
    } catch (err) {
      const status =
        err instanceof AxiosError ? (err.response?.status ?? 0) : 0;
      const message = extractApiMessage(err);
      if (status === 409) {
        toast.error(
          message || 'Une campagne existe déjà pour cet exercice.',
        );
      } else {
        toast.error(message || 'Création refusée.');
      }
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
          <DialogTitle>Créer une nouvelle campagne budgétaire</DialogTitle>
          <DialogDescription>
            Renseignez les paramètres de la campagne. Le Comité
            budgétaire sera nominé après création.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          data-testid="form-creer-campagne"
        >
          <div>
            <Label htmlFor="campagne-code">Code</Label>
            <Input
              id="campagne-code"
              {...register('code')}
              placeholder="CAMPAGNE_2027"
              className="mt-1"
            />
            {errors.code && (
              <p className="text-xs text-(--destructive) mt-1">
                {errors.code.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="campagne-exercice">Exercice fiscal</Label>
            <Input
              id="campagne-exercice"
              type="number"
              {...register('exerciceFiscal', { valueAsNumber: true })}
              className="mt-1"
            />
            {errors.exerciceFiscal && (
              <p className="text-xs text-(--destructive) mt-1">
                {errors.exerciceFiscal.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="campagne-libelle">Libellé</Label>
            <Input
              id="campagne-libelle"
              {...register('libelle')}
              className="mt-1"
            />
            {errors.libelle && (
              <p className="text-xs text-(--destructive) mt-1">
                {errors.libelle.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="campagne-signataire">
              Signataire par défaut
            </Label>
            <Controller
              control={control}
              name="fkUserSignataireDefaut"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger
                    id="campagne-signataire"
                    className="mt-1"
                    data-testid="select-signataire"
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
            {errors.fkUserSignataireDefaut && (
              <p className="text-xs text-(--destructive) mt-1">
                {errors.fkUserSignataireDefaut.message}
              </p>
            )}
          </div>

          <div>
            <Label>Mode de visa par défaut</Label>
            <Controller
              control={control}
              name="modeVisaDefaut"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PARALLELE">
                      Parallèle — visas dans n'importe quel ordre
                    </SelectItem>
                    <SelectItem value="SEQUENTIEL">
                      Séquentiel — chaque viseur attend le précédent
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
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
              data-testid="btn-submit-creer-campagne"
              className="bg-(--miznas-bleu-nuit-dark) hover:bg-(--miznas-bleu-nuit-dark)/90 text-white"
            >
              {submitting ? 'Création…' : 'Créer'}
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
