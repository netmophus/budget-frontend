/**
 * PvApprobationApercu (Lot 8.3.D P3) — rendu visuel type "PV officiel
 * du Conseil d'Administration" BSIC NIGER.
 *
 * Différences avec `NotePreparatoireApercu` (Lot 8.3.C) et les 3
 * précédents :
 *  - En-tête institutionnelle "BSIC NIGER — Conseil d'Administration"
 *    (pas Direction Générale)
 *  - Bandeau n° résolution + date + lieu en encadré formel
 *  - **Table de quorum** présents/total + **badge ✓/✗ atteint**
 *    (visualisation immédiate du quorum statutaire)
 *  - **2 sections HTML TipTap** rendues via `dangerouslySetInnerHTML`
 *    (ordre du jour + décisions) — premier aperçu avec 2 zones riches
 *  - Bloc vote avec mise en valeur du résultat (couleur conditionnelle :
 *    UNANIMITE = vert, MAJORITE = bleu, REJETE = rouge)
 *  - **Double signature** (Président + Secrétaire de séance) au lieu
 *    de la signature unique DG des 4 aperçus précédents
 *
 * **Sécurité XSS** : `ordreDuJourHtml` et `decisionsHtml` rendus via
 * `dangerouslySetInnerHTML` — compromis ASSUMÉ et documenté (cohérent
 * Lots 8.3.A/B/C). TipTap émet du HTML sécurisé par défaut.
 *
 * TODO : durcir avec sanitize-html à terme si le périmètre s'ouvre
 * à des contenus externes ou multi-tenants (cf. décision Lot 8.2.B P1
 * — DOMPurify pas installé dans le projet à ce stade).
 */
import { useBanque } from '@/lib/branding/banque-context';
import type { DocumentOfficiel } from '@/types/document';
import {
  type PvApprobationDetail,
  VOTE_RESULTAT_LABEL,
  type VoteResultat,
} from '@/types/pv-approbation';

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

const VOTE_BADGE_STYLE: Record<VoteResultat, string> = {
  UNANIMITE: 'bg-green-100 text-green-800 border-green-300',
  MAJORITE: 'bg-blue-100 text-blue-800 border-blue-300',
  REJETE: 'bg-red-100 text-red-800 border-red-300',
};

interface PvApprobationApercuProps {
  document: DocumentOfficiel;
  detail: PvApprobationDetail | null;
}

export function PvApprobationApercu({
  document,
  detail,
}: PvApprobationApercuProps) {
  const { banque } = useBanque();
  const quorumBadge = detail?.quorumAtteint
    ? {
        label: '✓ Atteint',
        cls: 'bg-green-100 text-green-800 border-green-300',
      }
    : {
        label: '✗ Non atteint',
        cls: 'bg-red-100 text-red-800 border-red-300',
      };

  return (
    <div
      className="bg-white p-12 max-w-4xl mx-auto shadow-lg border border-(--border)"
      data-testid="pv-approbation-apercu"
    >
      {/* En-tête institutionnelle */}
      <div className="border-b-2 border-slate-800 pb-4 mb-8 text-center">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight m-0">
          {banque.nom}
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Conseil d'Administration — Procès-Verbal d'Approbation
        </p>
      </div>

      {/* Encadré identification (n° résolution + date + lieu) */}
      <div
        className="border-2 border-slate-300 p-4 mb-8 text-sm"
        data-testid="apercu-pv-identification"
      >
        <div className="grid grid-cols-2 gap-3">
          <p>
            <strong>N° résolution :</strong>{' '}
            <span className="font-mono">
              {detail?.numeroResolution ?? '—'}
            </span>
          </p>
          <p>
            <strong>Date de séance :</strong>{' '}
            {formatDateFr(detail?.dateSeanceCa)}
          </p>
          <p className="col-span-2">
            <strong>Lieu :</strong> {detail?.lieuSeance ?? '—'}
          </p>
        </div>
      </div>

      {/* Bloc objet */}
      <p className="font-bold mb-6 text-lg">
        Objet : {document.titre}
      </p>

      {/* 1. Présidence */}
      <h3 className="font-bold mb-2 text-base">1. Présidence de séance</h3>
      <div className="mb-6 text-sm grid grid-cols-2 gap-3 ml-4">
        <p>
          <strong>Président :</strong>{' '}
          {detail?.presidentSeance ?? '—'}
        </p>
        <p>
          <strong>Secrétaire :</strong>{' '}
          {detail?.secretaireSeance ?? '—'}
        </p>
      </div>

      {/* 2. Quorum (table + badge) */}
      <h3 className="font-bold mb-2 text-base">2. Quorum</h3>
      <table
        className="w-full mb-6 border-collapse text-sm"
        data-testid="apercu-pv-quorum-table"
      >
        <tbody>
          <tr>
            <td className="border border-slate-300 p-2 w-1/2">
              Administrateurs présents
            </td>
            <td className="border border-slate-300 p-2 text-right font-medium tabular-nums">
              {detail?.nbAdministrateursPresents ?? '—'}
            </td>
          </tr>
          <tr>
            <td className="border border-slate-300 p-2">
              Total administrateurs
            </td>
            <td className="border border-slate-300 p-2 text-right font-medium tabular-nums">
              {detail?.nbAdministrateursTotal ?? '—'}
            </td>
          </tr>
          <tr>
            <td className="border border-slate-300 p-2">
              Quorum statutaire
            </td>
            <td className="border border-slate-300 p-2 text-right">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${quorumBadge.cls}`}
                data-testid="apercu-pv-quorum-badge"
              >
                {quorumBadge.label}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      {/* 3. Ordre du jour (HTML TipTap rendu) */}
      {detail?.ordreDuJourHtml && (
        <>
          <h3 className="font-bold mb-2 text-base">3. Ordre du jour</h3>
          {/*
            TODO sécurité XSS : `ordreDuJourHtml` provient de TipTap qui
            émet du HTML sécurisé par défaut (whitelist StarterKit, pas
            de <script>, pas d'attributs on*). Si import HTML externe
            ajouté plus tard, intégrer DOMPurify ici.
          */}
          <div
            className="mb-6 prose prose-sm max-w-none border-l-4 border-slate-300 pl-4 bg-slate-50 p-3"
            data-testid="apercu-pv-ordre-du-jour"
            dangerouslySetInnerHTML={{ __html: detail.ordreDuJourHtml }}
          />
        </>
      )}

      {/* 4. Décisions adoptées (HTML TipTap rendu) */}
      {detail?.decisionsHtml && (
        <>
          <h3 className="font-bold mb-2 text-base">4. Décisions adoptées</h3>
          {/*
            TODO sécurité XSS : idem ordreDuJourHtml — TipTap StarterKit
            sécurisé par défaut. Durcir avec sanitize-html si import
            externe ajouté.
          */}
          <div
            className="mb-6 prose prose-sm max-w-none border-l-4 border-blue-300 pl-4 bg-blue-50 p-3"
            data-testid="apercu-pv-decisions"
            dangerouslySetInnerHTML={{ __html: detail.decisionsHtml }}
          />
        </>
      )}

      {/* 5. Vote + commentaire président */}
      {(detail?.voteResultat || detail?.commentairePresident) && (
        <>
          <h3 className="font-bold mb-2 text-base">
            5. Vote et commentaire du Président
          </h3>
          {detail?.voteResultat && (
            <p className="mb-2 text-sm">
              <strong>Résultat du vote :</strong>{' '}
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${VOTE_BADGE_STYLE[detail.voteResultat]}`}
                data-testid="apercu-pv-vote-badge"
              >
                {VOTE_RESULTAT_LABEL[detail.voteResultat]}
              </span>
            </p>
          )}
          {detail?.commentairePresident && (
            <p className="mb-6 text-sm whitespace-pre-line ml-4 italic bg-amber-50 p-3 border-l-4 border-amber-400">
              « {detail.commentairePresident} »
            </p>
          )}
        </>
      )}

      {/* Double signature (Président + Secrétaire) */}
      <div className="mt-16 grid grid-cols-2 gap-12 text-sm">
        <div>
          <p>Le Président de séance,</p>
          <p className="mt-16 font-bold">
            {detail?.presidentSeance ?? '—'}
          </p>
        </div>
        <div className="text-right">
          <p>Le Secrétaire de séance,</p>
          <p className="mt-16 font-bold">
            {detail?.secretaireSeance ?? '—'}
          </p>
        </div>
      </div>

      {document.statut === 'SIGNE' && document.dateSignature && (
        <p
          className="text-xs text-green-700 mt-8 text-center"
          data-testid="apercu-pv-signe-mention"
        >
          ✓ PV signé électroniquement le {formatDateFr(document.dateSignature)}
        </p>
      )}
    </div>
  );
}
