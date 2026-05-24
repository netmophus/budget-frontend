/**
 * LettreCadrageApercu (Lot 8.2.C P3) — rendu visuel type lettre
 * officielle BSIC NIGER, à partir du détail métier structuré.
 *
 * **Sécurité** : JSX structuré uniquement, AUCUN
 * `dangerouslySetInnerHTML`. Les seules données utilisateur affichées
 * sont les chaînes du détail cadrage + emetteur/signataire — pas de
 * risque XSS (React escape automatiquement).
 *
 * Format imprimable (max-w-4xl, ombre, bordures tableau). Si statut
 * SIGNE, mention "Signé électroniquement" + date.
 */
import type { DocumentOfficiel } from '@/types/document';
import type { LettreCadrageDetail } from '@/types/lettre-cadrage';

function formatDateFr(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatNumberFr(s: string | null | undefined, suffix = ''): string {
  if (!s) return '—';
  const n = Number.parseFloat(s);
  if (Number.isNaN(n)) return '—';
  return (
    new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n) + suffix
  );
}

interface LettreCadrageApercuProps {
  document: DocumentOfficiel;
  detail: LettreCadrageDetail | null;
}

export function LettreCadrageApercu({
  document,
  detail,
}: LettreCadrageApercuProps) {
  return (
    <div
      className="bg-white p-12 max-w-4xl mx-auto shadow-lg border border-(--border)"
      data-testid="lettre-cadrage-apercu"
    >
      {/* En-tête bancaire */}
      <div className="border-b-2 border-slate-800 pb-4 mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight m-0">
          BSIC NIGER
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Banque Sahélo-Saharienne pour l'Investissement et le Commerce
        </p>
      </div>

      {/* Référence + lieu/date */}
      <div className="flex justify-between text-sm mb-8">
        <div className="space-y-1">
          <p>
            <strong>Réf :</strong>{' '}
            <span className="font-mono">{document.codeDocument}</span>
          </p>
          {detail?.referenceHolding && (
            <p>
              <strong>Réf. Holding :</strong>{' '}
              <span className="font-mono">{detail.referenceHolding}</span>
            </p>
          )}
        </div>
        <p>Niamey, le {formatDateFr(document.dateCreation)}</p>
      </div>

      {/* Objet */}
      <p className="font-bold mb-4">Objet : {document.titre}</p>

      {/* Texte introductif */}
      <p className="mb-4">Madame, Monsieur les Directeurs,</p>
      <p className="mb-6 text-justify">
        Conformément aux orientations stratégiques du Conseil
        d'Administration de la BSIC Holding, j'ai l'honneur de vous
        communiquer les axes de cadrage pour l'exercice budgétaire à
        venir.
      </p>

      {/* 1. Objectifs quantitatifs */}
      <h3 className="font-bold mb-2 text-base">1. Objectifs quantitatifs</h3>
      <table className="w-full mb-6 border-collapse text-sm">
        <tbody>
          <ApercuRow
            label="Produit Net Bancaire (PNB) cible"
            value={formatNumberFr(detail?.pnbCibleMfcfa, ' M FCFA')}
          />
          <ApercuRow
            label="Résultat Net (RN) cible"
            value={formatNumberFr(detail?.rnCibleMfcfa, ' M FCFA')}
          />
          <ApercuRow
            label="Croissance crédits clientèle"
            value={formatNumberFr(detail?.croissanceCreditsPct, ' %')}
          />
          <ApercuRow
            label="Croissance dépôts clientèle"
            value={formatNumberFr(detail?.croissanceDepotsPct, ' %')}
          />
          <ApercuRow
            label="Coefficient d'exploitation"
            value={formatNumberFr(detail?.coefficientExploitationPct, ' %')}
          />
          <ApercuRow
            label="ROE cible"
            value={formatNumberFr(detail?.roeCiblePct, ' %')}
          />
        </tbody>
      </table>

      {/* 2. Ratios prudentiels BCEAO */}
      <h3 className="font-bold mb-2 text-base">
        2. Ratios prudentiels minimaux (BCEAO)
      </h3>
      <table className="w-full mb-6 border-collapse text-sm">
        <tbody>
          <ApercuRow
            label="Ratio solvabilité minimal"
            value={formatNumberFr(detail?.ratioSolvabiliteMinPct, ' %')}
          />
          <ApercuRow
            label="Ratio liquidité minimal"
            value={formatNumberFr(detail?.ratioLiquiditeMinPct, ' %')}
          />
          <ApercuRow
            label="Ratio division des risques"
            value={formatNumberFr(detail?.ratioDivisionRisquesPct, ' %')}
          />
        </tbody>
      </table>

      {/* 3. Calendrier */}
      <h3 className="font-bold mb-2 text-base">3. Calendrier budgétaire</h3>
      <table className="w-full mb-6 border-collapse text-sm">
        <tbody>
          <ApercuRow
            label="Début de saisie"
            value={formatDateFr(detail?.dateDebutSaisie)}
          />
          <ApercuRow
            label="Date limite saisie CR"
            value={formatDateFr(detail?.dateLimiteSaisieCr)}
          />
          <ApercuRow
            label="Validation DGA"
            value={formatDateFr(detail?.dateValidationDga)}
          />
          <ApercuRow
            label="Validation DG"
            value={formatDateFr(detail?.dateValidationDg)}
          />
          <ApercuRow
            label="Publication BCEAO"
            value={formatDateFr(detail?.datePublicationBceao)}
          />
        </tbody>
      </table>

      {/* 4. Orientations (si présent) */}
      {detail?.orientationsStrategiques && (
        <>
          <h3 className="font-bold mb-2 text-base">
            4. Orientations stratégiques
          </h3>
          <p className="mb-6 text-justify whitespace-pre-line">
            {detail.orientationsStrategiques}
          </p>
        </>
      )}

      {/* Signature */}
      <div className="mt-16 text-right">
        <p>Le Directeur Général,</p>
        <p className="mt-16 font-bold">
          {document.signataire
            ? `${document.signataire.prenom} ${document.signataire.nom}`
            : '—'}
        </p>
        {document.statut === 'SIGNE' && document.dateSignature && (
          <p
            className="text-xs text-green-700 mt-2"
            data-testid="apercu-signe-mention"
          >
            ✓ Signé électroniquement le {formatDateFr(document.dateSignature)}
          </p>
        )}
      </div>
    </div>
  );
}

function ApercuRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td className="border border-slate-300 p-2">{label}</td>
      <td className="border border-slate-300 p-2 text-right font-medium tabular-nums">
        {value}
      </td>
    </tr>
  );
}
