/**
 * LettreMobilisationApercu (Lot 8.3.B P3) — rendu visuel type
 * "Lettre officielle DG aux Directeurs" BSIC NIGER.
 *
 * Différence avec `NoteOrientationApercu` (Lot 8.3.A) :
 *  - format "Lettre officielle Direction Générale" (pas note interne)
 *  - en-tête + référence + date (flex justify-between) + destinataires
 *    "À :" en haut + salutation "Mesdames et Messieurs les Directeurs"
 *  - 3 cards indicateurs mobilisation (couleurs distinctives bleu/blanc/vert)
 *  - tableau échéances rendu CONDITIONNEL (uniquement les dates renseignées)
 *  - message DG : effet citation (border-l-4 slate + italic)
 *  - engagement : effet mise en valeur (bg-amber-50 + border-l-4 amber)
 *
 * **Sécurité XSS** : `messageDgHtml` rendu via `dangerouslySetInnerHTML`
 * — compromis ASSUMÉ et documenté (cohérent NoteOrientationApercu).
 * TipTap émet du HTML sécurisé par défaut.
 */
import type { DocumentOfficiel } from '@/types/document';
import type { LettreMobilisationDetail } from '@/types/lettre-mobilisation';

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

interface LettreMobilisationApercuProps {
  document: DocumentOfficiel;
  detail: LettreMobilisationDetail | null;
}

export function LettreMobilisationApercu({
  document,
  detail,
}: LettreMobilisationApercuProps) {
  // Y a-t-il au moins une date d'échéance renseignée ?
  const hasAnyEcheance = !!(
    detail?.dateReunionMobilisation ||
    detail?.dateDebutSaisieObjectifs ||
    detail?.datePremierPointAvancement ||
    detail?.dateValidationFinale ||
    detail?.dateCommunicationBceao
  );

  return (
    <div
      className="bg-white p-12 max-w-4xl mx-auto shadow-lg border border-(--border)"
      data-testid="lettre-mobilisation-apercu"
    >
      {/* En-tête bancaire */}
      <div className="border-b-2 border-slate-800 pb-4 mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight m-0">
          BSIC NIGER
        </h1>
        <p className="text-sm text-slate-600 mt-1">Direction Générale</p>
      </div>

      {/* Référence + lieu/date */}
      <div className="flex justify-between text-sm mb-8">
        <div>
          <p>
            <strong>Réf :</strong>{' '}
            <span className="font-mono">
              {detail?.referenceLettre ?? '—'}
            </span>
          </p>
        </div>
        <p>Niamey, le {formatDateFr(detail?.dateEmission)}</p>
      </div>

      {/* Destinataires */}
      <div className="text-sm mb-6">
        <p className="font-medium mb-1">À :</p>
        <p className="whitespace-pre-line ml-4">
          {detail?.destinatairesDirections ??
            'Mesdames et Messieurs les Directeurs'}
        </p>
      </div>

      {/* Objet */}
      <p className="font-bold mb-4 text-lg">Objet : {document.titre}</p>

      {/* Salutation + intro */}
      <p className="mb-4">Mesdames et Messieurs les Directeurs,</p>
      {detail?.exerciceConcerne && (
        <p className="mb-6 text-justify">
          Dans le cadre de la préparation et de l'exécution du budget de
          l'exercice <strong>{detail.exerciceConcerne}</strong>, je vous
          adresse cette lettre de mobilisation qui formalise nos
          engagements collectifs
          {detail.dateDebutExecution &&
            ` pour la période du ${formatDateFr(detail.dateDebutExecution)}`}
          {detail.dateFinExecution &&
            ` au ${formatDateFr(detail.dateFinExecution)}`}
          .
        </p>
      )}

      {/* 1. Objectifs globaux */}
      <h3 className="font-bold mb-2 text-base">
        1. Objectifs globaux BSIC NIGER
      </h3>
      <table className="w-full mb-6 border-collapse text-sm">
        <tbody>
          <ApercuRow
            label="Produit Net Bancaire (PNB) consolidé cible"
            value={formatNumberFr(detail?.pnbConsolideMfcfa, ' M FCFA')}
          />
          <ApercuRow
            label="Résultat Net (RN) consolidé cible"
            value={formatNumberFr(detail?.rnConsolideMfcfa, ' M FCFA')}
          />
          <ApercuRow
            label="Croissance crédits globale"
            value={formatNumberFr(
              detail?.croissanceCreditsGlobalePct,
              ' %',
            )}
          />
          <ApercuRow
            label="Croissance dépôts globale"
            value={formatNumberFr(
              detail?.croissanceDepotsGlobalePct,
              ' %',
            )}
          />
        </tbody>
      </table>

      {/* 2. Indicateurs de mobilisation */}
      <h3 className="font-bold mb-2 text-base">
        2. Indicateurs de mobilisation
      </h3>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="border border-blue-300 p-3 rounded-md bg-blue-50">
          <p className="text-xs text-slate-600 uppercase tracking-wider">
            Taux participation visé
          </p>
          <p className="text-2xl font-bold text-blue-700 tabular-nums">
            {formatNumberFr(detail?.tauxParticipationVisePct, ' %')}
          </p>
        </div>
        <div className="border border-slate-300 p-3 rounded-md">
          <p className="text-xs text-slate-600 uppercase tracking-wider">
            Objectifs prioritaires
          </p>
          <p className="text-2xl font-bold tabular-nums">
            {detail?.nbObjectifsPrioritaires ?? '—'}
          </p>
        </div>
        <div className="border border-green-300 p-3 rounded-md bg-green-50">
          <p className="text-xs text-slate-600 uppercase tracking-wider">
            Taux conformité visé
          </p>
          <p className="text-2xl font-bold text-green-700 tabular-nums">
            {formatNumberFr(detail?.tauxConformiteBudgetairePct, ' %')}
          </p>
        </div>
      </div>

      {/* 3. Échéances clés (rendu conditionnel) */}
      {hasAnyEcheance && (
        <>
          <h3 className="font-bold mb-2 text-base">3. Échéances clés</h3>
          <table className="w-full mb-6 border-collapse text-sm">
            <tbody>
              {detail?.dateReunionMobilisation && (
                <ApercuRow
                  label="Réunion de mobilisation"
                  value={formatDateFr(detail.dateReunionMobilisation)}
                />
              )}
              {detail?.dateDebutSaisieObjectifs && (
                <ApercuRow
                  label="Début saisie objectifs CR"
                  value={formatDateFr(detail.dateDebutSaisieObjectifs)}
                />
              )}
              {detail?.datePremierPointAvancement && (
                <ApercuRow
                  label="1er point d'avancement"
                  value={formatDateFr(detail.datePremierPointAvancement)}
                />
              )}
              {detail?.dateValidationFinale && (
                <ApercuRow
                  label="Validation finale"
                  value={formatDateFr(detail.dateValidationFinale)}
                />
              )}
              {detail?.dateCommunicationBceao && (
                <ApercuRow
                  label="Communication BCEAO"
                  value={formatDateFr(detail.dateCommunicationBceao)}
                />
              )}
            </tbody>
          </table>
        </>
      )}

      {/* 4. Message du DG (HTML TipTap rendu — effet citation) */}
      {detail?.messageDgHtml && (
        <>
          <h3 className="font-bold mb-2 text-base">
            4. Message du Directeur Général
          </h3>
          {/*
            TODO sécurité XSS : `messageDgHtml` provient de TipTap qui
            émet du HTML sécurisé par défaut (whitelist StarterKit, pas
            de <script>, pas d'attributs on*). Si import HTML externe
            ajouté plus tard, intégrer DOMPurify ici.

            Lot 8.3.G volet 3 : `text-justify hyphens-auto` ajouté pour
            convention typographique des lettres officielles (cohérent
            D12 LettreOfficialisationApercu). L'italique reste actif
            car appliqué sur le même container.

            Hotfix 8.3.G : `max-w-none!` (Tailwind v4 important suffix)
            force l'annulation du `max-width: 65ch` injecté par défaut
            par `.prose` — sans `!`, le texte restait limité à ~65
            caractères. Cf. doc LettreOfficialisationApercu.
          */}
          <div
            className="mb-6 prose prose-sm max-w-none! border-l-4 border-slate-300 pl-4 italic text-justify hyphens-auto"
            data-testid="apercu-message-dg-html"
            dangerouslySetInnerHTML={{ __html: detail.messageDgHtml }}
          />
        </>
      )}

      {/* 5. Engagement attendu (mise en valeur amber) */}
      {detail?.engagementAttendu && (
        <>
          <h3 className="font-bold mb-2 text-base">5. Engagement demandé</h3>
          <p className="mb-6 text-sm whitespace-pre-line bg-amber-50 border-l-4 border-amber-400 p-4">
            {detail.engagementAttendu}
          </p>
        </>
      )}

      {/* Conclusion motivationnelle */}
      <p className="mb-6 text-sm">
        Je compte sur la mobilisation de chacun d'entre vous pour
        atteindre nos ambitions collectives.
      </p>

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
            data-testid="apercu-mobilisation-signe-mention"
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
