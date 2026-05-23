/**
 * Helper pour déclencher un download d'un Blob dans le navigateur.
 *
 * Pattern axios `responseType: 'blob'` côté lib/api/* → `URL.createObjectURL`
 * → lien `<a download>` invisible programmatique. `URL.revokeObjectURL`
 * libère la mémoire après le click.
 *
 * Promu depuis `pages/DocumentsPage.tsx` au Lot 8.2.B Palier 3 : 3
 * usages (DocumentsPage row dropdown, DocumentDetailPage ActionBar +
 * OngletFichier) → externalisation pour éviter la duplication. Sera
 * réutilisé pour tout download binaire à venir (R04 BCEAO, exports
 * comptables, etc.).
 */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
