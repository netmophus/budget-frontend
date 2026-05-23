/**
 * DocumentDetailPage (Lot 8.2.B Palier 2) — vue détaillée d'un
 * document officiel avec workflow visa/signature.
 *
 * Layout général :
 *   - Breadcrumb « Retour aux documents »
 *   - Header (code mono + StatutDocumentBadge + libellé type) +
 *     bandeau actions contextuel
 *   - Cartouche infos (Titre / Émetteur / Signataire / Référence)
 *   - 4 onglets Tabs (custom Lot 5.3.B, signature props array) :
 *      • Contenu  — texte HTML + référence externe
 *      • Visas    — tableau membres comité + statut visa
 *      • Historique — timeline lazy (charge à l'ouverture)
 *      • Fichier  — PDF original (download / upload placeholder P3)
 *
 * Boutons d'action (placeholders P3/P4) :
 *   - Éditer / Uploader PDF / Soumettre (BROUILLON + émetteur)
 *   - Apporter visa (SOUMIS_VISA + viseur EN_ATTENTE)
 *   - Signer (VISE + signataire désigné)
 *   - Vérifier intégrité + Télécharger (SIGNE)
 *
 * Pattern "boutons visibles seulement si rôle utilisateur compatible
 * avec le statut" + désactivation+tooltip si conditions transitoires
 * manquent (ex: pas de PDF avant Soumettre). UX bancaire = transparence.
 *
 * Modales (CreerDocumentModal/EditerDocumentModal/UploaderFichierModal/
 * ApporterVisaModal/SignerDocumentModal) sont des placeholders toast
 * en P2 — livrés aux Paliers P3 et P4.
 */
import { AxiosError } from 'axios';
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FilePlus,
  FileSignature,
  FileText,
  History,
  Layers,
  Pencil,
  PenTool,
  Send,
  ShieldCheck,
  Upload,
  XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { ApporterVisaModal } from '@/components/documents/ApporterVisaModal';
import { EditerDocumentModal } from '@/components/documents/EditerDocumentModal';
import { SignerDocumentModal } from '@/components/documents/SignerDocumentModal';
import { UploaderFichierModal } from '@/components/documents/UploaderFichierModal';
import { StatutDocumentBadge } from '@/components/StatutDocumentBadge';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { triggerBlobDownload } from '@/lib/blob-download';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  detailDocument,
  historiqueDocument,
  soumettreVisa,
  telechargerFichierDocument,
} from '@/lib/api/documents';
import { useAuthStore } from '@/lib/auth/auth-store';
import {
  type DocumentHistoriqueEvenement,
  type DocumentOfficiel,
  type DocumentVisaResume,
  STATUT_VISA_LABEL,
  type StatutVisa,
  TYPE_DOCUMENT_LABEL,
} from '@/types/document';

// ─── Hook useDocumentActions ─────────────────────────────────────────

interface ActionState {
  ok: boolean;
  reason?: string;
}

interface DocumentActions {
  canEditer: ActionState;
  canUploadFichier: ActionState;
  canSoumettre: ActionState;
  canViser: ActionState;
  canSigner: ActionState;
  canTelechargerFichier: ActionState;
  /** Metadata utilisée pour l'affichage conditionnel des boutons. */
  isEmetteur: boolean;
  isSignataire: boolean;
  monVisaEnAttente: DocumentVisaResume | undefined;
}

function useDocumentActions(
  doc: DocumentOfficiel | null,
  currentUserId: string | null,
): DocumentActions {
  return useMemo(() => {
    if (!doc || !currentUserId) {
      const not: ActionState = {
        ok: false,
        reason: 'Document ou utilisateur non chargé',
      };
      return {
        canEditer: not,
        canUploadFichier: not,
        canSoumettre: not,
        canViser: not,
        canSigner: not,
        canTelechargerFichier: not,
        isEmetteur: false,
        isSignataire: false,
        monVisaEnAttente: undefined,
      };
    }

    const isEmetteur = doc.fkUserEmetteur === currentUserId;
    const isSignataire = doc.fkUserSignataire === currentUserId;
    const monVisaEnAttente = doc.visas?.find(
      (v) => v.fkUserViseur === currentUserId && v.statut === 'EN_ATTENTE',
    );
    const hasFichier = !!doc.fichierJointNom;
    const contenuVide = !doc.contenuHtml || doc.contenuHtml.trim() === '';

    const canEditer: ActionState =
      doc.statut !== 'BROUILLON'
        ? {
            ok: false,
            reason: `Édition possible seulement en BROUILLON (statut actuel : ${doc.statut}).`,
          }
        : !isEmetteur
          ? { ok: false, reason: "Réservé à l'émetteur du document." }
          : { ok: true };

    const canUploadFichier: ActionState =
      doc.statut !== 'BROUILLON'
        ? {
            ok: false,
            reason: `Upload possible seulement en BROUILLON (statut actuel : ${doc.statut}).`,
          }
        : !isEmetteur
          ? { ok: false, reason: "Réservé à l'émetteur du document." }
          : { ok: true };

    const canSoumettre: ActionState =
      doc.statut !== 'BROUILLON'
        ? {
            ok: false,
            reason: `Soumission possible seulement en BROUILLON (statut actuel : ${doc.statut}).`,
          }
        : !isEmetteur
          ? { ok: false, reason: "Réservé à l'émetteur." }
          : !hasFichier
            ? {
                ok: false,
                reason:
                  "Vous devez d'abord uploader le PDF original avant de soumettre.",
              }
            : contenuVide
              ? {
                  ok: false,
                  reason: 'Le résumé (contenu HTML) ne peut pas être vide.',
                }
              : { ok: true };

    const canViser: ActionState =
      doc.statut !== 'SOUMIS_VISA'
        ? {
            ok: false,
            reason: `Visa possible seulement en SOUMIS_VISA (statut actuel : ${doc.statut}).`,
          }
        : !monVisaEnAttente
          ? {
              ok: false,
              reason:
                "Vous n'êtes pas dans le Comité ou avez déjà visé ce document.",
            }
          : { ok: true };

    const canSigner: ActionState =
      doc.statut !== 'VISE'
        ? {
            ok: false,
            reason: `Signature possible seulement en VISE (statut actuel : ${doc.statut}).`,
          }
        : !isSignataire
          ? { ok: false, reason: 'Réservé au signataire désigné du document.' }
          : { ok: true };

    const canTelechargerFichier: ActionState = hasFichier
      ? { ok: true }
      : { ok: false, reason: 'Aucun fichier joint à ce document.' };

    return {
      canEditer,
      canUploadFichier,
      canSoumettre,
      canViser,
      canSigner,
      canTelechargerFichier,
      isEmetteur,
      isSignataire,
      monVisaEnAttente,
    };
  }, [doc, currentUserId]);
}

// ─── Helpers ─────────────────────────────────────────────────────────

function formatDateFr(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
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

// ─── Composant principal ─────────────────────────────────────────────

export function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [doc, setDoc] = useState<DocumentOfficiel | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editerOpen, setEditerOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [soumettreOpen, setSoumettreOpen] = useState(false);
  const [visaOpen, setVisaOpen] = useState(false);
  const [signerOpen, setSignerOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    detailDocument(id)
      .then(setDoc)
      .catch(() => toast.error('Impossible de charger le document'))
      .finally(() => setLoading(false));
  }, [id, refreshKey]);

  const actions = useDocumentActions(doc, user?.id ?? null);

  if (loading || !doc) {
    return (
      <div className="text-sm text-(--muted-foreground) p-4">Chargement…</div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate('/documents')}
        className="inline-flex items-center gap-1 text-xs text-(--muted-foreground) hover:text-(--foreground) mb-4"
      >
        <ArrowLeft className="w-3 h-3" />
        Retour aux documents
      </button>

      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3">
          <div
            style={{ backgroundColor: '#0C447C1A' }}
            className="w-10 h-10 rounded-md flex items-center justify-center"
            aria-hidden="true"
          >
            <FileText className="w-5 h-5" style={{ color: '#0C447C' }} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="text-[19px] font-semibold tracking-tight m-0 font-mono">
                {doc.codeDocument}
              </h3>
              <StatutDocumentBadge statut={doc.statut} />
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-(--muted) text-(--muted-foreground)">
                {TYPE_DOCUMENT_LABEL[doc.typeDocument] ?? doc.typeDocument}
              </span>
            </div>
            <p className="text-xs text-(--muted-foreground) mt-0.5">
              {doc.titre}
            </p>
          </div>
        </div>

        <ActionBar
          doc={doc}
          actions={actions}
          handlers={{
            onEditer: () => setEditerOpen(true),
            onUploadFichier: () => setUploadOpen(true),
            onSoumettre: () => setSoumettreOpen(true),
            onApporterVisa: () => setVisaOpen(true),
            onSigner: () => setSignerOpen(true),
          }}
        />
      </div>

      {/* Cartouche infos */}
      <div className="bg-(--secondary) border border-(--border) rounded-md p-4 mb-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
        <InfoCell
          label="Émetteur"
          value={
            doc.emetteur
              ? `${doc.emetteur.prenom} ${doc.emetteur.nom}`
              : `user.id=${doc.fkUserEmetteur}`
          }
        />
        <InfoCell
          label="Signataire désigné"
          value={
            doc.signataire
              ? `${doc.signataire.prenom} ${doc.signataire.nom}`
              : `user.id=${doc.fkUserSignataire}`
          }
        />
        <InfoCell
          label="Référence externe"
          value={doc.referenceExterne ?? '—'}
        />
        <InfoCell
          label="Créé le"
          value={formatDateFr(doc.dateCreation)}
        />
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          {
            value: 'contenu',
            label: (
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Contenu
              </span>
            ),
            content: <OngletContenu doc={doc} />,
          },
          {
            value: 'visas',
            label: (
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" /> Visas
              </span>
            ),
            content: <OngletVisas visas={doc.visas ?? []} />,
          },
          {
            value: 'historique',
            label: (
              <span className="flex items-center gap-1.5">
                <History className="w-3.5 h-3.5" /> Historique
              </span>
            ),
            content: <OngletHistorique documentId={doc.id} />,
          },
          {
            value: 'fichier',
            label: (
              <span className="flex items-center gap-1.5">
                <FileSignature className="w-3.5 h-3.5" /> Fichier
              </span>
            ),
            content: (
              <OngletFichier
                doc={doc}
                canUpload={actions.canUploadFichier}
                canDownload={actions.canTelechargerFichier}
                onUploadClick={() => setUploadOpen(true)}
              />
            ),
          },
        ]}
        defaultValue="contenu"
      />

      <EditerDocumentModal
        open={editerOpen}
        onClose={() => setEditerOpen(false)}
        doc={doc}
        onUpdated={(updated) => setDoc(updated)}
      />

      <UploaderFichierModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        documentId={doc.id}
        fichierJointNom={doc.fichierJointNom}
        onUploaded={() => setRefreshKey((k) => k + 1)}
      />

      <ConfirmDialog
        isOpen={soumettreOpen}
        onClose={() => setSoumettreOpen(false)}
        onConfirm={async () => {
          try {
            await soumettreVisa(doc.id);
            toast.success(`${doc.codeDocument} soumis au visa.`);
            setRefreshKey((k) => k + 1);
          } catch (err) {
            toast.error(
              extractApiMessage(err) || 'Soumission refusée.',
            );
            throw err;
          }
        }}
        title={`Soumettre ${doc.codeDocument} au visa ?`}
        description={
          <>
            <p>
              Le document passera en{' '}
              <strong>SOUMIS_VISA</strong> et le Comité de la campagne
              sera figé en snapshot (les visas porteront sur ces
              membres précisément, même si le Comité évolue après).
            </p>
            <p className="mt-2">
              Vous ne pourrez plus éditer le document tant que le
              Comité n'aura pas terminé ses visas.
            </p>
          </>
        }
        confirmText="Soumettre au visa"
        cancelText="Annuler"
      />

      <ApporterVisaModal
        open={visaOpen}
        onClose={() => setVisaOpen(false)}
        documentId={doc.id}
        codeDocument={doc.codeDocument}
        onSubmitted={() => setRefreshKey((k) => k + 1)}
      />

      <SignerDocumentModal
        open={signerOpen}
        onClose={() => setSignerOpen(false)}
        documentId={doc.id}
        codeDocument={doc.codeDocument}
        titre={doc.titre}
        onSigned={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}

// ─── Bandeau d'actions contextuel ────────────────────────────────────

interface ActionBarHandlers {
  onEditer: () => void;
  onUploadFichier: () => void;
  onSoumettre: () => void;
  onApporterVisa: () => void;
  onSigner: () => void;
}

function ActionBar({
  doc,
  actions,
  handlers,
}: {
  doc: DocumentOfficiel;
  actions: DocumentActions;
  handlers: ActionBarHandlers;
}) {
  // BROUILLON + émetteur → Éditer / Upload / Soumettre
  if (doc.statut === 'BROUILLON' && actions.isEmetteur) {
    return (
      <div className="flex gap-2">
        <ActionButton
          state={actions.canEditer}
          icon={Pencil}
          label="Éditer"
          testId="btn-editer-document"
          onClick={handlers.onEditer}
        />
        <ActionButton
          state={actions.canUploadFichier}
          icon={Upload}
          label="Uploader PDF"
          testId="btn-upload-fichier"
          onClick={handlers.onUploadFichier}
        />
        <ActionButton
          state={actions.canSoumettre}
          icon={Send}
          label="Soumettre au visa"
          testId="btn-soumettre-document"
          primary
          onClick={handlers.onSoumettre}
        />
      </div>
    );
  }

  // SOUMIS_VISA + viseur en attente → Apporter visa
  if (
    doc.statut === 'SOUMIS_VISA' &&
    actions.monVisaEnAttente !== undefined
  ) {
    return (
      <ActionButton
        state={actions.canViser}
        icon={PenTool}
        label="Apporter mon visa"
        testId="btn-apporter-visa"
        primary
        onClick={handlers.onApporterVisa}
      />
    );
  }

  // VISE + signataire → Signer
  if (doc.statut === 'VISE' && actions.isSignataire) {
    return (
      <ActionButton
        state={actions.canSigner}
        icon={PenTool}
        label="Signer le document"
        testId="btn-signer-document"
        primary
        onClick={handlers.onSigner}
      />
    );
  }

  // SIGNE → Vérifier intégrité + Télécharger
  if (doc.statut === 'SIGNE') {
    return (
      <div className="flex gap-2">
        <ActionButton
          state={{ ok: true }}
          icon={ShieldCheck}
          label="Vérifier l'intégrité"
          testId="btn-verifier-integrite"
          onClick={() =>
            toast.info(
              "Vérification d'intégrité affichée dans une future modale.",
            )
          }
        />
        {actions.canTelechargerFichier.ok && (
          <ActionButton
            state={actions.canTelechargerFichier}
            icon={Download}
            label="Télécharger PDF"
            testId="btn-telecharger-fichier"
            onClick={async () => {
              try {
                const blob = await telechargerFichierDocument(doc.id);
                triggerBlobDownload(
                  blob,
                  doc.fichierJointNom ?? `${doc.codeDocument}.pdf`,
                );
                toast.success(`Téléchargement de ${doc.fichierJointNom}`);
              } catch (err) {
                toast.error(
                  extractApiMessage(err) || 'Téléchargement refusé',
                );
              }
            }}
          />
        )}
      </div>
    );
  }

  return null;
}

interface ActionButtonProps {
  state: ActionState;
  icon: typeof Pencil;
  label: string;
  testId: string;
  onClick: () => void;
  primary?: boolean;
}

function ActionButton({
  state,
  icon: Icon,
  label,
  testId,
  onClick,
  primary,
}: ActionButtonProps) {
  const btn = (
    <Button
      disabled={!state.ok}
      onClick={onClick}
      data-testid={testId}
      className={
        primary && state.ok
          ? 'h-9 px-3.5 bg-(--miznas-bleu-nuit-dark) hover:bg-(--miznas-bleu-nuit-dark)/90 text-white gap-1.5'
          : 'h-9 px-3.5 gap-1.5'
      }
      variant={primary && state.ok ? 'default' : 'outline'}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </Button>
  );

  if (!state.ok && state.reason) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {/* Wrapper span : un Button disabled ne déclenche pas les
              events hover/focus → tooltip Radix sinon invisible. */}
          <span tabIndex={0}>{btn}</span>
        </TooltipTrigger>
        <TooltipContent>{state.reason}</TooltipContent>
      </Tooltip>
    );
  }
  return btn;
}

function InfoCell({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="text-[10px] text-(--muted-foreground) uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className="text-[13px]">{value}</div>
    </div>
  );
}

// ─── Tab Contenu ─────────────────────────────────────────────────────

function OngletContenu({ doc }: { doc: DocumentOfficiel }) {
  return (
    <div className="bg-white border border-(--border) rounded-md p-6">
      {doc.referenceExterne && (
        <div className="mb-4">
          <div className="text-[10px] text-(--muted-foreground) uppercase tracking-wider mb-1">
            Référence externe
          </div>
          <div className="text-[13px] font-mono">{doc.referenceExterne}</div>
        </div>
      )}
      {/*
        TODO sécurité XSS — `dangerouslySetInnerHTML` direct.
        DOMPurify n'est pas dans le projet (cf. découverte Lot 8.2.B P1).
        Acceptable dans le contexte actuel : le HTML provient d'un
        formulaire backend authentifié + RBAC (DOCUMENT.CREER), pas
        d'input non-fiable. À traiter dans un futur lot sécurité si
        le périmètre s'ouvre à des contenus externes ou multi-tenants.
      */}
      {doc.contenuHtml ? (
        <div
          className="prose prose-sm max-w-none text-[13px]"
          data-testid="contenu-html"
          dangerouslySetInnerHTML={{ __html: doc.contenuHtml }}
        />
      ) : (
        <p className="text-sm text-(--muted-foreground) italic">
          Aucun contenu — le résumé peut être ajouté en éditant le document.
        </p>
      )}
    </div>
  );
}

// ─── Tab Visas ───────────────────────────────────────────────────────

const STATUT_VISA_CONFIG: Record<
  StatutVisa,
  { hex: string; bgHex: string }
> = {
  EN_ATTENTE: { hex: '#5F6B7A', bgHex: '#5F6B7A1A' },
  VISE: { hex: '#0F6E56', bgHex: '#0F6E561A' },
  REJETE: { hex: '#BA1717', bgHex: '#BA17171A' },
  IGNORE: { hex: '#9C9C9C', bgHex: '#9C9C9C1A' },
};

function StatutVisaBadge({ statut }: { statut: StatutVisa }) {
  const cfg = STATUT_VISA_CONFIG[statut] ?? STATUT_VISA_CONFIG.EN_ATTENTE;
  return (
    <span
      data-testid={`statut-visa-badge-${statut}`}
      style={{ backgroundColor: cfg.bgHex, color: cfg.hex }}
      className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold w-fit"
    >
      {STATUT_VISA_LABEL[statut] ?? statut}
    </span>
  );
}

function OngletVisas({ visas }: { visas: DocumentVisaResume[] }) {
  const sorted = [...visas].sort((a, b) => a.ordreVisa - b.ordreVisa);
  if (sorted.length === 0) {
    return (
      <div className="bg-white border border-(--border) rounded-md p-10 text-center text-sm text-(--muted-foreground)">
        Aucun visa enregistré. Le snapshot du Comité est créé au moment
        de la soumission au visa.
      </div>
    );
  }
  return (
    <div
      className="bg-white border border-(--border) rounded-md overflow-hidden"
      data-testid="visas-table"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px]">Ordre</TableHead>
            <TableHead>Nom</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Fonction</TableHead>
            <TableHead className="w-[120px]">Statut</TableHead>
            <TableHead className="w-[120px]">Date action</TableHead>
            <TableHead>Commentaire</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((v) => (
            <TableRow key={v.id} data-testid={`visa-row-${v.id}`}>
              <TableCell className="tabular-nums">{v.ordreVisa}</TableCell>
              <TableCell className="text-[13px]">
                {v.user ? `${v.user.prenom} ${v.user.nom}` : '—'}
              </TableCell>
              <TableCell className="text-[13px] text-(--muted-foreground)">
                {v.user?.email ?? '—'}
              </TableCell>
              <TableCell className="text-[13px]">
                {v.libelleFonction ?? '—'}
                {!v.estObligatoire && (
                  <span className="ml-2 text-[10px] text-(--muted-foreground)">
                    (consultatif)
                  </span>
                )}
              </TableCell>
              <TableCell>
                <StatutVisaBadge statut={v.statut} />
              </TableCell>
              <TableCell className="text-[13px] text-(--muted-foreground) tabular-nums">
                {formatDateFr(v.dateAction)}
              </TableCell>
              <TableCell className="text-[13px] max-w-[300px] truncate">
                {v.commentaire ?? '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ─── Tab Historique (lazy load) ──────────────────────────────────────

const ETAPE_ICON_CONFIG: Record<
  DocumentHistoriqueEvenement['etape'],
  { Icon: typeof FilePlus; hex: string; bgHex: string }
> = {
  CREATION: { Icon: FilePlus, hex: '#5F6B7A', bgHex: '#5F6B7A1A' },
  EDITION: { Icon: Pencil, hex: '#5F6B7A', bgHex: '#5F6B7A1A' },
  SOUMISSION: { Icon: Send, hex: '#BA7517', bgHex: '#BA75171A' },
  VISA: { Icon: CheckCircle2, hex: '#0F6E56', bgHex: '#0F6E561A' },
  REJET: { Icon: XCircle, hex: '#BA1717', bgHex: '#BA17171A' },
  SIGNATURE: { Icon: FileSignature, hex: '#2E5BAE', bgHex: '#2E5BAE1A' },
};

function OngletHistorique({ documentId }: { documentId: string }) {
  // Lazy load : ce composant n'est monté que lorsque le tab Historique
  // est sélectionné (Tabs custom Lot 5.3.B ne rend que le content actif).
  const [evenements, setEvenements] = useState<
    DocumentHistoriqueEvenement[] | null
  >(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    historiqueDocument(documentId)
      .then((res) => setEvenements(res.evenements))
      .catch(() => toast.error("Impossible de charger l'historique"))
      .finally(() => setLoading(false));
  }, [documentId]);

  if (loading) {
    return (
      <div className="bg-white border border-(--border) rounded-md p-6 text-sm text-(--muted-foreground)">
        Chargement de l'historique…
      </div>
    );
  }
  if (!evenements || evenements.length === 0) {
    return (
      <div
        className="bg-white border border-(--border) rounded-md p-10 text-center text-sm text-(--muted-foreground)"
        data-testid="historique-empty"
      >
        Aucun événement enregistré dans l'audit pour ce document.
      </div>
    );
  }
  return (
    <div
      className="bg-white border border-(--border) rounded-md p-6"
      data-testid="historique-timeline"
    >
      <ol className="relative space-y-6 pl-6">
        {/* Trait vertical en CSS */}
        <span
          aria-hidden="true"
          className="absolute left-[11px] top-1 bottom-1 w-[1px] bg-(--border)"
        />
        {evenements.map((ev, idx) => {
          const cfg =
            ETAPE_ICON_CONFIG[ev.etape] ?? ETAPE_ICON_CONFIG.CREATION;
          const Icon = cfg.Icon;
          return (
            <li
              key={`${ev.etape}-${idx}-${ev.date}`}
              className="relative"
              data-testid={`evt-${ev.etape}-${idx}`}
            >
              <span
                style={{ backgroundColor: cfg.bgHex, color: cfg.hex }}
                className="absolute -left-6 w-6 h-6 rounded-full inline-flex items-center justify-center"
              >
                <Icon className="w-3.5 h-3.5" />
              </span>
              <div className="text-[13px] font-medium">{ev.libelle}</div>
              <div className="text-xs text-(--muted-foreground) tabular-nums">
                {ev.acteur} — {formatDateFr(ev.date)}
              </div>
              {ev.commentaire && (
                <div className="text-xs text-(--foreground) mt-1 italic">
                  « {ev.commentaire} »
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ─── Tab Fichier ─────────────────────────────────────────────────────

function OngletFichier({
  doc,
  canUpload,
  canDownload,
  onUploadClick,
}: {
  doc: DocumentOfficiel;
  canUpload: ActionState;
  canDownload: ActionState;
  onUploadClick: () => void;
}) {
  async function handleDownload() {
    if (!doc.fichierJointNom) return;
    try {
      const blob = await telechargerFichierDocument(doc.id);
      triggerBlobDownload(blob, doc.fichierJointNom);
      toast.success(`Téléchargement de ${doc.fichierJointNom}`);
    } catch (err) {
      toast.error(extractApiMessage(err) || 'Téléchargement refusé');
    }
  }

  if (doc.fichierJointNom) {
    return (
      <div
        className="bg-white border border-(--border) rounded-md p-6"
        data-testid="fichier-present"
      >
        <div className="flex items-center gap-4">
          <div
            style={{ backgroundColor: '#0C447C1A' }}
            className="w-12 h-12 rounded-md flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <FileText className="w-6 h-6" style={{ color: '#0C447C' }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium truncate">
              {doc.fichierJointNom}
            </div>
            <div className="text-xs text-(--muted-foreground)">
              PDF original — source de vérité documentaire (audit BCEAO 10 ans)
            </div>
          </div>
          <Button
            onClick={() => void handleDownload()}
            disabled={!canDownload.ok}
            data-testid="btn-dl-fichier-tab"
            variant="outline"
            className="h-9 gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Télécharger
          </Button>
          {canUpload.ok && (
            <Button
              onClick={onUploadClick}
              data-testid="btn-replace-fichier"
              variant="outline"
              className="h-9 gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              Remplacer
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-white border border-(--border) rounded-md p-10 text-center"
      data-testid="fichier-empty"
    >
      <FileText className="w-10 h-10 mx-auto mb-3 text-(--muted-foreground)" />
      <p className="text-sm text-(--muted-foreground) mb-4">
        Aucun fichier PDF attaché à ce document.
      </p>
      {canUpload.ok && (
        <Button
          onClick={onUploadClick}
          data-testid="btn-upload-fichier-tab"
          className="h-9 gap-1.5 bg-(--miznas-bleu-nuit-dark) hover:bg-(--miznas-bleu-nuit-dark)/90 text-white"
        >
          <Upload className="w-3.5 h-3.5" />
          Uploader un PDF
        </Button>
      )}
    </div>
  );
}
