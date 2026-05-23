/**
 * DocumentsPage (Lot 8.2.B Palier 1) — liste des documents officiels
 * avec 4 filtres (Campagne / Type / Statut / Mon rôle) et tableau
 * shadcn/ui Table.
 *
 * Volume cible : pas de pagination prévue dans le backend (filtré par
 * scope). Si volumétrie explose, ajout pagination au Lot 8.2.x futur.
 *
 * Le bouton "Créer un document" expose un placeholder toast au P1
 * (composant `CreerDocumentModal` livré au Palier 3). Permet de
 * câbler dès maintenant la garde RBAC + le testid sans bloquer la
 * cadence par paliers.
 */
import { AxiosError } from 'axios';
import {
  Download,
  Eye,
  FileText,
  MoreHorizontal,
  Plus,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { StatutDocumentBadge } from '@/components/StatutDocumentBadge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { listerCampagnes } from '@/lib/api/campagnes';
import {
  type ListerDocumentsQuery,
  listerDocuments,
  telechargerFichierDocument,
} from '@/lib/api/documents';
import { useHasPermission } from '@/lib/auth/permissions';
import type { Campagne } from '@/types/campagne';
import {
  type DocumentOfficiel,
  type StatutDocument,
  STATUT_DOCUMENT_LABEL,
  type TypeDocument,
  TYPE_DOCUMENT_LABEL,
} from '@/types/document';

/** Sentinel pour "Tous" — Radix Select interdit value="" pour SelectItem. */
const ALL = '__all__';

const STATUTS: StatutDocument[] = [
  'BROUILLON',
  'SOUMIS_VISA',
  'VISE',
  'SIGNE',
  'ARCHIVE',
];

const TYPES: TypeDocument[] = [
  'D2_LETTRE_CADRAGE',
  'D3_NOTE_ORIENTATION',
  'D5_LETTRE_DG',
  'R3_BORDEREAU_VALIDATION',
  'R5_BORDEREAU_REJET',
  'D11_PV_APPROBATION',
  'D12_LETTRE_OFFICIALISATION',
];

/**
 * Mapping UI 4 options → API 3 valeurs.
 * Le filtre "Tous les documents" envoie undefined côté API (le scope
 * RBAC backend renvoie alors tout ce que l'utilisateur peut voir).
 */
const ROLE_OPTIONS: Array<{
  value: string;
  label: string;
  api: 'emetteur' | 'viseur_en_attente' | 'signataire' | undefined;
}> = [
  { value: ALL, label: 'Tous les documents', api: undefined },
  { value: 'mes-creations', label: 'Mes créations', api: 'emetteur' },
  { value: 'a-viser', label: 'À viser', api: 'viseur_en_attente' },
  { value: 'a-signer', label: 'À signer', api: 'signataire' },
];

/**
 * Helper pour déclencher un download d'un Blob dans le navigateur.
 * Pattern axios `responseType: blob` + URL.createObjectURL + lien
 * invisible programmatique. Préfixe `URL.revokeObjectURL` pour
 * libérer la mémoire.
 *
 * Non exporté pour respecter `react-refresh/only-export-components`.
 * Sera promu dans `lib/blob-download.ts` si réutilisé au P2/P3.
 */
function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function formatDateFr(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
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

export function DocumentsPage() {
  const navigate = useNavigate();
  const canCreer = useHasPermission('DOCUMENT.CREER');

  const [data, setData] = useState<DocumentOfficiel[]>([]);
  const [campagnes, setCampagnes] = useState<Campagne[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterStatut, setFilterStatut] = useState<string>(ALL);
  const [filterType, setFilterType] = useState<string>(ALL);
  const [filterCampagne, setFilterCampagne] = useState<string>(ALL);
  const [filterRole, setFilterRole] = useState<string>(ALL);

  // Charge les campagnes une fois pour le dropdown filtre.
  useEffect(() => {
    listerCampagnes()
      .then(setCampagnes)
      .catch(() => toast.error('Impossible de charger les campagnes'));
  }, []);

  useEffect(() => {
    setLoading(true);
    const query: ListerDocumentsQuery = {};
    if (filterStatut !== ALL) query.statut = filterStatut as StatutDocument;
    if (filterType !== ALL) query.typeDocument = filterType as TypeDocument;
    if (filterCampagne !== ALL) query.fkCampagne = filterCampagne;
    const roleOpt = ROLE_OPTIONS.find((r) => r.value === filterRole);
    if (roleOpt?.api) query.monRole = roleOpt.api;

    listerDocuments(query)
      .then(setData)
      .catch(() => toast.error('Impossible de charger les documents'))
      .finally(() => setLoading(false));
  }, [filterStatut, filterType, filterCampagne, filterRole]);

  function resetFilters() {
    setFilterStatut(ALL);
    setFilterType(ALL);
    setFilterCampagne(ALL);
    setFilterRole(ALL);
  }

  async function handleDownload(doc: DocumentOfficiel) {
    if (!doc.fichierJointNom) return;
    try {
      const blob = await telechargerFichierDocument(doc.id);
      triggerBlobDownload(blob, doc.fichierJointNom);
      toast.success(`Téléchargement de ${doc.fichierJointNom}`);
    } catch (err) {
      toast.error(extractApiMessage(err) || 'Téléchargement refusé');
    }
  }

  return (
    <div>
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
            <h3 className="text-[19px] font-semibold tracking-tight m-0">
              Documents officiels
            </h3>
            <p className="text-xs text-(--muted-foreground) mt-0.5">
              Lettres de cadrage, notes d'orientation, PV — workflow
              visa / signature
            </p>
          </div>
        </div>

        {canCreer && (
          <Button
            onClick={() =>
              toast.info(
                'Modale de création disponible au Palier 3 (Lot 8.2.B).',
              )
            }
            data-testid="btn-creer-document"
            className="h-9 px-3.5 bg-(--miznas-bleu-nuit-dark) hover:bg-(--miznas-bleu-nuit-dark)/90 text-white gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Créer un document
          </Button>
        )}
      </div>

      {/* Filtres */}
      <div className="bg-(--secondary) border border-(--border) rounded-md p-3 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2.5">
          <FilterSelect
            label="Campagne"
            value={filterCampagne}
            onChange={setFilterCampagne}
            options={[
              { value: ALL, label: 'Toutes' },
              ...campagnes.map((c) => ({ value: c.id, label: c.code })),
            ]}
            testId="filter-campagne"
          />
          <FilterSelect
            label="Type"
            value={filterType}
            onChange={setFilterType}
            options={[
              { value: ALL, label: 'Tous' },
              ...TYPES.map((t) => ({
                value: t,
                label: TYPE_DOCUMENT_LABEL[t],
              })),
            ]}
            testId="filter-type"
          />
          <FilterSelect
            label="Statut"
            value={filterStatut}
            onChange={setFilterStatut}
            options={[
              { value: ALL, label: 'Tous' },
              ...STATUTS.map((s) => ({
                value: s,
                label: STATUT_DOCUMENT_LABEL[s],
              })),
            ]}
            testId="filter-statut"
          />
          <FilterSelect
            label="Mon rôle"
            value={filterRole}
            onChange={setFilterRole}
            options={ROLE_OPTIONS.map((o) => ({
              value: o.value,
              label: o.label,
            }))}
            testId="filter-role"
          />
          <div className="flex items-end">
            <Button
              variant="outline"
              size="sm"
              onClick={resetFilters}
              data-testid="btn-reset-filters"
              className="h-9"
            >
              Réinitialiser
            </Button>
          </div>
        </div>
      </div>

      {/* Tableau */}
      <div
        className="bg-white border border-(--border) rounded-md overflow-hidden"
        data-testid="doc-table"
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Code</TableHead>
              <TableHead>Titre</TableHead>
              <TableHead className="w-[180px]">Type</TableHead>
              <TableHead className="w-[140px]">Statut</TableHead>
              <TableHead className="w-[180px]">Émetteur</TableHead>
              <TableHead className="w-[180px]">Signataire</TableHead>
              <TableHead className="w-[100px]">Modifié</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading &&
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  {Array.from({ length: 8 }).map((__, j) => (
                    <TableCell key={`sk-${i}-${j}`}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!loading && data.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-10 text-(--muted-foreground)"
                >
                  Aucun document trouvé avec ces filtres.
                  {canCreer && " Cliquez sur « Créer » pour démarrer."}
                </TableCell>
              </TableRow>
            )}
            {!loading &&
              data.map((doc) => (
                <TableRow
                  key={doc.id}
                  data-testid={`doc-row-${doc.id}`}
                  onClick={() => navigate(`/documents/${doc.id}`)}
                  className="cursor-pointer"
                >
                  <TableCell className="font-mono text-xs">
                    {doc.codeDocument}
                  </TableCell>
                  <TableCell className="text-[13px] max-w-[300px] truncate">
                    {doc.titre}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-(--muted) text-(--muted-foreground)">
                      {TYPE_DOCUMENT_LABEL[doc.typeDocument] ??
                        doc.typeDocument}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatutDocumentBadge statut={doc.statut} />
                  </TableCell>
                  <TableCell className="text-[13px]">
                    {doc.emetteur
                      ? `${doc.emetteur.prenom} ${doc.emetteur.nom}`
                      : '—'}
                  </TableCell>
                  <TableCell className="text-[13px]">
                    {doc.signataire
                      ? `${doc.signataire.prenom} ${doc.signataire.nom}`
                      : '—'}
                  </TableCell>
                  <TableCell className="text-[13px] text-(--muted-foreground) tabular-nums">
                    {formatDateFr(doc.dateModification ?? doc.dateCreation)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 rounded hover:bg-(--muted)/40"
                          data-testid={`doc-actions-${doc.id}`}
                          aria-label="Actions"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenuItem
                          onSelect={() => navigate(`/documents/${doc.id}`)}
                        >
                          <Eye className="w-4 h-4" />
                          Voir détail
                        </DropdownMenuItem>
                        {doc.fichierJointNom && (
                          <DropdownMenuItem
                            onSelect={() => void handleDownload(doc)}
                            data-testid={`doc-dl-${doc.id}`}
                          >
                            <Download className="w-4 h-4" />
                            Télécharger PDF
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

interface FilterSelectProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  testId: string;
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  testId,
}: FilterSelectProps) {
  return (
    <div>
      <Label className="text-xs mb-1 block">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 bg-white" data-testid={testId}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
