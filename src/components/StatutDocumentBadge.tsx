/**
 * StatutDocumentBadge (Lot 8.2.B) — badge coloré pour les 5 statuts
 * du workflow document. Pattern aligné sur StatutCampagneBadge avec
 * la défense `?? FALLBACK` héritée du hotfix Lot 8.2.A (un statut
 * inconnu rendrait sinon un crash silencieux écran blanc).
 */
import {
  Archive,
  CheckCircle2,
  FileCheck2,
  HelpCircle,
  Pencil,
  Send,
  type LucideIcon,
} from 'lucide-react';

import {
  STATUT_DOCUMENT_LABEL,
  type StatutDocument,
} from '@/types/document';

const STATUT_DOC_CONFIG: Record<
  StatutDocument,
  { hex: string; bgHex: string; Icon: LucideIcon }
> = {
  BROUILLON: { hex: '#5F6B7A', bgHex: '#5F6B7A1A', Icon: Pencil },
  SOUMIS_VISA: { hex: '#BA7517', bgHex: '#BA75171A', Icon: Send },
  VISE: { hex: '#2E5BAE', bgHex: '#2E5BAE1A', Icon: FileCheck2 },
  SIGNE: { hex: '#0F6E56', bgHex: '#0F6E561A', Icon: CheckCircle2 },
  ARCHIVE: { hex: '#5F6B7A', bgHex: '#5F6B7A1A', Icon: Archive },
};

const FALLBACK_BADGE_CONFIG = {
  hex: '#5F6B7A',
  bgHex: '#5F6B7A1A',
  Icon: HelpCircle,
};

export function StatutDocumentBadge({
  statut,
}: {
  statut: StatutDocument;
}) {
  const cfg = STATUT_DOC_CONFIG[statut] ?? FALLBACK_BADGE_CONFIG;
  const Icon = cfg.Icon;
  const label = STATUT_DOCUMENT_LABEL[statut] ?? '—';
  const testId = statut
    ? `statut-doc-badge-${statut}`
    : 'statut-doc-badge-inconnu';
  return (
    <span
      data-testid={testId}
      style={{ backgroundColor: cfg.bgHex, color: cfg.hex }}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold w-fit"
    >
      <Icon className="w-3 h-3" aria-hidden="true" />
      {label}
    </span>
  );
}
