/**
 * NotePreparatoireApercu (Lot 8.3.C P3) — rendu visuel type "Note
 * préparatoire formelle DG → Comité" BSIC NIGER.
 *
 * Différences avec `LettreMobilisationApercu` (Lot 8.3.B) :
 *  - en-tête sobre "Direction Générale — Note Préparatoire"
 *  - bloc convocation distinctif (`bg-slate-50` + border-l-4) en
 *    haut, regroupant objet + date réunion + lieu (informations clés
 *    de la convocation)
 *  - salutation "Mesdames et Messieurs les membres du Comité"
 *  - ordre du jour rendu via `dangerouslySetInnerHTML` (HTML TipTap)
 *    avec mise en forme typographique `prose` + bordure latérale
 *  - section "Points clés à débattre" mise en valeur bleu (informatif)
 *  - section "Décisions attendues" mise en valeur ambre + gras
 *    (action attendue du Comité)
 *  - conclusion sobre "Je compte sur votre présence active"
 *
 * **Sécurité XSS** : `ordreDuJourHtml` rendu via
 * `dangerouslySetInnerHTML` — compromis ASSUMÉ et documenté (cohérent
 * `NoteOrientationApercu` Lot 8.3.A + `LettreMobilisationApercu`
 * Lot 8.3.B). TipTap émet du HTML sécurisé par défaut.
 */
import { useBanque } from '@/lib/branding/banque-context';
import type { DocumentOfficiel } from '@/types/document';
import type { NotePreparatoireDetail } from '@/types/note-preparatoire';

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

interface NotePreparatoireApercuProps {
  document: DocumentOfficiel;
  detail: NotePreparatoireDetail | null;
}

export function NotePreparatoireApercu({
  document,
  detail,
}: NotePreparatoireApercuProps) {
  const { banque } = useBanque();
  return (
    <div
      className="bg-white p-12 max-w-4xl mx-auto shadow-lg border border-(--border)"
      data-testid="note-preparatoire-apercu"
    >
      {/* En-tête bancaire */}
      <div className="border-b-2 border-slate-800 pb-4 mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight m-0">
          {banque.nom}
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Direction Générale — Note Préparatoire
        </p>
      </div>

      {/* Référence + lieu/date */}
      <div className="flex justify-between text-sm mb-6">
        <div>
          <p>
            <strong>Réf :</strong>{' '}
            <span className="font-mono">
              {detail?.referenceNote ?? '—'}
            </span>
          </p>
        </div>
        <p>Niamey, le {formatDateFr(detail?.dateEmission)}</p>
      </div>

      {/* Bloc convocation Comité (informations clés en haut) */}
      <div
        className="bg-slate-50 p-4 mb-6 border-l-4 border-slate-400 text-sm"
        data-testid="apercu-bloc-convocation"
      >
        <p className="mb-1">
          <strong>Objet :</strong> {document.titre}
        </p>
        {detail?.dateConvocationComite && (
          <p className="mb-1">
            <strong>Réunion prévue le :</strong>{' '}
            {formatDateFr(detail.dateConvocationComite)}
          </p>
        )}
        {detail?.lieuReunion && (
          <p>
            <strong>Lieu :</strong> {detail.lieuReunion}
          </p>
        )}
      </div>

      {/* Salutation */}
      <p className="mb-6 text-sm">
        Mesdames et Messieurs les membres du Comité,
      </p>

      {/* 1. Participants convoqués */}
      {detail?.participantsConvoques && (
        <>
          <h3 className="font-bold mb-2 text-base">
            1. Participants convoqués
          </h3>
          <p className="mb-6 text-sm whitespace-pre-line ml-4">
            {detail.participantsConvoques}
          </p>
        </>
      )}

      {/* 2. Exercice budgétaire concerné */}
      {detail?.exerciceConcerne && (
        <>
          <h3 className="font-bold mb-2 text-base">
            2. Exercice budgétaire concerné
          </h3>
          <p className="mb-2 text-sm">
            <strong>Exercice :</strong> {detail.exerciceConcerne}
          </p>
          {(detail.dateDebutPreparation ||
            detail.dateButoirPreparation) && (
            <p className="mb-6 text-sm">
              {detail.dateDebutPreparation && (
                <>
                  Début préparation :{' '}
                  <strong>
                    {formatDateFr(detail.dateDebutPreparation)}
                  </strong>
                </>
              )}
              {detail.dateDebutPreparation &&
                detail.dateButoirPreparation &&
                ' — '}
              {detail.dateButoirPreparation && (
                <>
                  Butoir :{' '}
                  <strong>
                    {formatDateFr(detail.dateButoirPreparation)}
                  </strong>
                </>
              )}
            </p>
          )}
        </>
      )}

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
            data-testid="apercu-ordre-du-jour-html"
            dangerouslySetInnerHTML={{ __html: detail.ordreDuJourHtml }}
          />
        </>
      )}

      {/* 4. Documents pré-lus attendus */}
      {detail?.documentsPreLus && (
        <>
          <h3 className="font-bold mb-2 text-base">
            4. Documents pré-lus attendus
          </h3>
          <p className="mb-6 text-sm whitespace-pre-line ml-4 italic">
            {detail.documentsPreLus}
          </p>
        </>
      )}

      {/* 5. Points clés à débattre (mise en valeur bleu informatif) */}
      {detail?.pointsClesDebattre && (
        <>
          <h3 className="font-bold mb-2 text-base">
            5. Points clés à débattre
          </h3>
          <p className="mb-6 text-sm whitespace-pre-line bg-blue-50 p-4 border-l-4 border-blue-400">
            {detail.pointsClesDebattre}
          </p>
        </>
      )}

      {/* 6. Décisions attendues (mise en valeur ambre + gras) */}
      {detail?.decisionsAttendues && (
        <>
          <h3 className="font-bold mb-2 text-base">
            6. Décisions attendues
          </h3>
          <p className="mb-6 text-sm whitespace-pre-line bg-amber-50 p-4 border-l-4 border-amber-400 font-medium">
            {detail.decisionsAttendues}
          </p>
        </>
      )}

      {/* Conclusion sobre */}
      <p className="mb-6 text-sm">
        Je compte sur votre présence active et votre préparation rigoureuse
        pour faire de cette réunion un moment de décision stratégique.
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
            data-testid="apercu-preparatoire-signe-mention"
          >
            ✓ Signé électroniquement le {formatDateFr(document.dateSignature)}
          </p>
        )}
      </div>
    </div>
  );
}
