/**
 * API client — module reporting (Lot 7.6).
 *
 * Téléchargements des rapports officiels MIZNAS (R01–R20). Premier
 * rapport implémenté : R04 "Budget Publié BCEAO" (PDF 12 pages + XLSX
 * 5 onglets), disponible uniquement pour les versions au statut `gele`.
 *
 * Pattern blob → ObjectURL → click programmatique → revoke. Les
 * endpoints backend posent Content-Disposition: attachment, donc le
 * navigateur n'ouvre pas le fichier dans l'onglet.
 */
import { apiClient } from './client';

export async function downloadR04Pdf(
  versionId: string,
  codeVersion: string,
): Promise<void> {
  const response = await apiClient.get<Blob>(
    `/reporting/r04-budget-bceao/${versionId}.pdf`,
    { responseType: 'blob' },
  );
  triggerDownload(
    response.data,
    `${codeVersion}_R04_BCEAO_${formatToday()}.pdf`,
  );
}

export async function downloadR04Xlsx(
  versionId: string,
  codeVersion: string,
): Promise<void> {
  const response = await apiClient.get<Blob>(
    `/reporting/r04-budget-bceao/${versionId}.xlsx`,
    { responseType: 'blob' },
  );
  triggerDownload(
    response.data,
    `${codeVersion}_R04_BCEAO_${formatToday()}.xlsx`,
  );
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

function formatToday(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}
