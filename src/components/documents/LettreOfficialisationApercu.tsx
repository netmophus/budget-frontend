/**
 * LettreOfficialisationApercu (Lot 8.3.E P3) — rendu visuel type
 * "Lettre officielle BSIC" pour notifier l'approbation du budget
 * aux parties prenantes.
 *
 * Différences avec `PvApprobationApercu` (Lot 8.3.D) et les 4
 * précédents :
 *  - En-tête institutionnelle "BSIC NIGER" + adresse (format
 *    courrier officiel, pas "Conseil d'Administration")
 *  - Bloc référence en haut à droite (n° lettre + date émission +
 *    lieu Niamey) — codes postaux courrier français
 *  - Bloc destinataires à gauche en haut (style "À l'attention de")
 *  - Objet en gras souligné centré sous les destinataires
 *  - Référence : affichée distinctement (lien sémantique vers PV CA)
 *  - Corps de la lettre via `dangerouslySetInnerHTML` (TipTap)
 *  - Bloc signature : "Le signataire" + **badge "🔖 Cachet apposé"**
 *    SI cachet_appose === true (badge ambre distinctif)
 *  - Pied de page : pièces jointes listées + date entrée vigueur
 *
 * **Sécurité XSS** : `corpsHtml` rendu via `dangerouslySetInnerHTML` —
 * compromis ASSUMÉ et documenté (cohérent Lots 8.3.A/B/C/D). TipTap
 * émet du HTML sécurisé par défaut.
 *
 * TODO : durcir avec sanitize-html à terme si le périmètre s'ouvre
 * à des contenus externes ou multi-tenants.
 */
import type { DocumentOfficiel } from '@/types/document';
import type { LettreOfficialisationDetail } from '@/types/lettre-officialisation';

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

interface LettreOfficialisationApercuProps {
  document: DocumentOfficiel;
  detail: LettreOfficialisationDetail | null;
}

export function LettreOfficialisationApercu({
  document,
  detail,
}: LettreOfficialisationApercuProps) {
  return (
    <div
      className="bg-white p-12 max-w-4xl mx-auto shadow-lg border border-(--border)"
      data-testid="lettre-officialisation-apercu"
    >
      {/* En-tête institutionnelle */}
      <div className="border-b-2 border-slate-800 pb-4 mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight m-0">
          BSIC NIGER
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Direction Générale — Boulevard de la Liberté, BP 12 080, Niamey
        </p>
      </div>

      {/* Bloc référence + lieu/date en haut à droite */}
      <div className="flex justify-between text-sm mb-8">
        {/* Destinataires à gauche */}
        <div>
          <p className="font-medium mb-1">À l'attention de :</p>
          <p className="whitespace-pre-line ml-4 italic">
            {detail?.destinatairesPrincipaux ??
              'Mesdames et Messieurs les Directeurs'}
          </p>
        </div>
        {/* Référence + lieu */}
        <div className="text-right">
          <p>
            <strong>Réf :</strong>{' '}
            <span className="font-mono">{detail?.numeroLettre ?? '—'}</span>
          </p>
          <p>Niamey, le {formatDateFr(detail?.dateEmission)}</p>
        </div>
      </div>

      {/* Objet (gras + souligné centré) */}
      <p
        className="font-bold text-center mb-6 text-base underline underline-offset-4"
        data-testid="apercu-lod-objet"
      >
        Objet : {detail?.objet ?? document.titre}
      </p>

      {/* Référence PV CA si renseignée */}
      {detail?.referencePvCa && (
        <p className="text-sm mb-6 ml-4">
          <strong>Référence :</strong>{' '}
          <span className="font-mono">{detail.referencePvCa}</span>
        </p>
      )}

      {/* Corps de la lettre (HTML TipTap rendu) */}
      {detail?.corpsHtml ? (
        <>
          {/*
            TODO sécurité XSS : `corpsHtml` provient de TipTap qui émet
            du HTML sécurisé par défaut (whitelist StarterKit, pas de
            <script>, pas d'attributs on*). Si import HTML externe
            ajouté plus tard, intégrer DOMPurify ici.
          */}
          <div
            className="mb-8 prose prose-sm max-w-none"
            data-testid="apercu-lod-corps"
            dangerouslySetInnerHTML={{ __html: detail.corpsHtml }}
          />
        </>
      ) : (
        <p className="mb-8 text-sm text-(--muted-foreground) italic ml-4">
          (Corps de la lettre à rédiger)
        </p>
      )}

      {/* Bloc signature */}
      <div className="mt-12 text-right text-sm">
        <p>{detail?.signataire ? `Le ${detail.signataire},` : '—'}</p>
        <p className="mt-16 font-bold">{detail?.signataire ?? '—'}</p>
        {detail?.cachetAppose === true && (
          <p
            className="inline-flex items-center gap-1 mt-3 px-3 py-1 rounded text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300"
            data-testid="apercu-lod-cachet-appose-badge"
          >
            🔖 Cachet apposé
          </p>
        )}
        {document.statut === 'SIGNE' && document.dateSignature && (
          <p
            className="text-xs text-green-700 mt-3"
            data-testid="apercu-lod-signe-mention"
          >
            ✓ Signé électroniquement le {formatDateFr(document.dateSignature)}
          </p>
        )}
      </div>

      {/* Pied de page : copies + pièces jointes + entrée en vigueur */}
      <div className="mt-12 pt-4 border-t border-slate-300 text-xs text-slate-600 space-y-3">
        {detail?.destinatairesCopies && (
          <div>
            <p className="font-semibold mb-1">Copies :</p>
            <p className="whitespace-pre-line ml-4">
              {detail.destinatairesCopies}
            </p>
          </div>
        )}
        {detail?.piecesJointes && (
          <div>
            <p className="font-semibold mb-1">Pièces jointes :</p>
            <p className="whitespace-pre-line ml-4">{detail.piecesJointes}</p>
          </div>
        )}
        {detail?.dateEntreeVigueur && (
          <p>
            <strong>Date d'entrée en vigueur :</strong>{' '}
            <span className="font-medium">
              {formatDateFr(detail.dateEntreeVigueur)}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
