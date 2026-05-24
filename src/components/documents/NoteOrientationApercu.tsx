/**
 * NoteOrientationApercu (Lot 8.3.A P3) — rendu visuel type "Note
 * Interne de Direction" BSIC NIGER, à partir du détail métier
 * structuré.
 *
 * Différence avec `LettreCadrageApercu` (Lot 8.2.C) :
 *  - format "Note interne" et non "Lettre officielle"
 *  - en-tête + bloc émetteur/destinataire (grid 2 cols)
 *  - tableau macro + cards positionnement (actuelle vs cible) +
 *    liste axes + bloc HTML TipTap rendu
 *
 * **Sécurité XSS** : `descriptionDetailleeHtml` rendu via
 * `dangerouslySetInnerHTML` — compromis ASSUMÉ et documenté. TipTap
 * (côté éditeur) émet du HTML sécurisé par défaut (whitelist
 * StarterKit, pas de `<script>`, pas d'attributs `on*`). Si à
 * l'avenir on supporte de l'import HTML externe (copier-coller depuis
 * autre source non maîtrisée), il faudra ajouter DOMPurify ici.
 * Les autres champs sont rendus en JSX pur (échappement React natif).
 */
import type { DocumentOfficiel } from '@/types/document';
import type { NoteOrientationDetail } from '@/types/note-orientation';

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

function formatNumberFr(
  s: string | null | undefined,
  suffix = '',
): string {
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

interface NoteOrientationApercuProps {
  document: DocumentOfficiel;
  detail: NoteOrientationDetail | null;
}

export function NoteOrientationApercu({
  document,
  detail,
}: NoteOrientationApercuProps) {
  return (
    <div
      className="bg-white p-12 max-w-4xl mx-auto shadow-lg border border-(--border)"
      data-testid="note-orientation-apercu"
    >
      {/* En-tête bancaire — note interne */}
      <div className="border-b-2 border-slate-800 pb-4 mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight m-0">
          BSIC NIGER
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Note Interne de Direction
        </p>
      </div>

      {/* Bloc émetteur/destinataire */}
      <div className="grid grid-cols-2 gap-4 text-sm mb-8 border border-(--border) rounded-md p-4 bg-slate-50">
        <div className="space-y-1">
          <p>
            <strong>Numéro :</strong>{' '}
            <span className="font-mono">{detail?.numeroNote ?? '—'}</span>
          </p>
          <p>
            <strong>Date :</strong> {formatDateFr(detail?.dateEmission)}
          </p>
        </div>
        <div className="space-y-1">
          <p>
            <strong>De :</strong>{' '}
            {detail?.emetteurDirection ?? 'Direction Générale'}
          </p>
          <p>
            <strong>À :</strong>{' '}
            {detail?.destinataire ?? 'Comité de Direction'}
          </p>
        </div>
      </div>

      {/* Objet + période */}
      <p className="font-bold mb-2 text-lg">Objet : {document.titre}</p>
      {(detail?.exerciceConcerne || detail?.dateDebutApplication) && (
        <p className="text-sm italic mb-6 text-slate-600">
          {detail?.exerciceConcerne ? `Exercice ${detail.exerciceConcerne}` : ''}
          {detail?.dateDebutApplication && (
            <>
              {detail?.exerciceConcerne ? ' — ' : ''}
              du {formatDateFr(detail.dateDebutApplication)} au{' '}
              {formatDateFr(detail.dateFinApplication)}
            </>
          )}
        </p>
      )}

      {/* 1. Hypothèses macroéconomiques */}
      <h3 className="font-bold mb-2 text-base">
        1. Hypothèses macroéconomiques
      </h3>
      <table className="w-full mb-6 border-collapse text-sm">
        <tbody>
          <ApercuRow
            label="Taux directeur BCEAO prévu"
            value={formatNumberFr(detail?.tauxDirecteurBceaoPct, ' %')}
          />
          <ApercuRow
            label="Inflation Niger attendue"
            value={formatNumberFr(detail?.inflationNigerPct, ' %')}
          />
          <ApercuRow
            label="Croissance PIB Niger prévue"
            value={formatNumberFr(detail?.croissancePibNigerPct, ' %')}
          />
          <ApercuRow
            label="Taux de change USD/FCFA"
            value={formatNumberFr(detail?.tauxChangeUsdFcfa, ' FCFA')}
          />
          <ApercuRow
            label="Cours pétrole brut"
            value={formatNumberFr(detail?.coursPetroleUsd, ' USD/baril')}
          />
        </tbody>
      </table>

      {/* 2. Positionnement marché */}
      <h3 className="font-bold mb-2 text-base">
        2. Positionnement marché BSIC NIGER
      </h3>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="border border-slate-300 p-3 rounded-md">
          <p className="text-xs text-slate-600 uppercase tracking-wider">
            Part de marché actuelle
          </p>
          <p className="text-2xl font-bold tabular-nums">
            {formatNumberFr(detail?.partMarcheActuellePct, ' %')}
          </p>
        </div>
        <div className="border border-green-300 p-3 rounded-md bg-green-50">
          <p className="text-xs text-slate-600 uppercase tracking-wider">
            Part de marché cible
          </p>
          <p className="text-2xl font-bold text-green-700 tabular-nums">
            {formatNumberFr(detail?.partMarcheCiblePct, ' %')}
          </p>
        </div>
      </div>
      {detail?.principauxConcurrents && (
        <p className="mb-2 text-sm">
          <strong>Principaux concurrents :</strong>{' '}
          {detail.principauxConcurrents}
        </p>
      )}
      {detail?.avantagesCompetitifs && (
        <p className="mb-6 text-sm">
          <strong>Avantages compétitifs :</strong>{' '}
          {detail.avantagesCompetitifs}
        </p>
      )}

      {/* 3. Axes stratégiques */}
      {(detail?.axeDigitalisation ||
        detail?.axeDeveloppementPme ||
        detail?.axeInclusionFinanciere ||
        detail?.axeAutresPriorites) && (
        <>
          <h3 className="font-bold mb-2 text-base">
            3. Axes stratégiques prioritaires
          </h3>
          <ul className="mb-6 space-y-2 list-disc list-inside text-sm">
            {detail?.axeDigitalisation && (
              <li>
                <strong>Digitalisation :</strong> {detail.axeDigitalisation}
              </li>
            )}
            {detail?.axeDeveloppementPme && (
              <li>
                <strong>Développement PME :</strong>{' '}
                {detail.axeDeveloppementPme}
              </li>
            )}
            {detail?.axeInclusionFinanciere && (
              <li>
                <strong>Inclusion financière :</strong>{' '}
                {detail.axeInclusionFinanciere}
              </li>
            )}
            {detail?.axeAutresPriorites && (
              <li>
                <strong>Autres priorités :</strong>{' '}
                {detail.axeAutresPriorites}
              </li>
            )}
          </ul>
        </>
      )}

      {/* 4. Analyse détaillée (HTML TipTap rendu) */}
      {detail?.descriptionDetailleeHtml && (
        <>
          <h3 className="font-bold mb-2 text-base">4. Analyse détaillée</h3>
          {/*
            TODO sécurité XSS : `descriptionDetailleeHtml` provient de
            l'éditeur TipTap qui émet du HTML sécurisé par défaut
            (whitelist StarterKit, pas de <script>, pas d'attributs on*).
            Si à l'avenir on supporte l'import HTML externe (copier-coller
            depuis source non maîtrisée), ajouter DOMPurify ici.
          */}
          <div
            className="prose prose-sm max-w-none mb-6"
            data-testid="apercu-description-html"
            dangerouslySetInnerHTML={{
              __html: detail.descriptionDetailleeHtml,
            }}
          />
        </>
      )}

      {/* 5. Recommandations */}
      {detail?.recommandations && (
        <>
          <h3 className="font-bold mb-2 text-base">5. Recommandations</h3>
          <p className="mb-6 text-sm whitespace-pre-line">
            {detail.recommandations}
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
            data-testid="apercu-note-signe-mention"
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
