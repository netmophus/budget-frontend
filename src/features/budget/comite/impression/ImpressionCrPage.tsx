/**
 * ImpressionCrPage (/budget/comite/cr/:crCode/impression?versionId=…) —
 * vue d'impression standalone (HORS layout MIZNAS) du détail d'un CR.
 *
 * Données : version + en-tête CR (statuts-crs) + lignes agrégées. La
 * source des lignes s'adapte à la permission :
 *   - BUDGET.VALIDER → endpoint Comité perimeter-free (tout CR) ;
 *   - sinon (saisisseur) → /faits/budget (filtré périmètre, son CR).
 *
 * Impression via window.print() ; mise en page A4 dans impression.css.
 */
import { ArrowLeft, Printer } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { listFaitsBudget } from '@/lib/api/budget';
import {
  getLignesCrComite,
  getStatutsCrsVersion,
  type CrStatutLigne,
} from '@/lib/api/cr-workflow';
import { getVersionById, type Version } from '@/lib/api/versions';
import { useHasPermission } from '@/lib/auth/permissions';
import { useAuthStore } from '@/lib/auth/auth-store';
import {
  agregerFaitsParCompteLigneMetier,
  construirePivotCr,
  type PivotCr,
} from '@/features/budget/lib/agregation-cr';
import { BlocDetailCrImpression } from './BlocDetailCrImpression';
import { EnteteImpression } from './EnteteImpression';
import { PiedPageImpression } from './PiedPageImpression';
import './impression.css';

function maintenantFr(): string {
  const d = new Date();
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(
    d.getHours(),
  )}:${p(d.getMinutes())}`;
}

function Message({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <div className="max-w-2xl mx-auto p-8 text-sm text-(--muted-foreground)">
      {children}
    </div>
  );
}

export function ImpressionCrPage(): JSX.Element {
  const { crCode } = useParams<{ crCode: string }>();
  const [params] = useSearchParams();
  const versionId = params.get('versionId');
  const navigate = useNavigate();

  const peutVoirTout = useHasPermission('BUDGET.VALIDER');
  const user = useAuthStore((s) => s.user);
  const dateGeneration = useMemo(() => maintenantFr(), []);

  const [version, setVersion] = useState<Version | null>(null);
  const [cr, setCr] = useState<CrStatutLigne | null>(null);
  const [pivot, setPivot] = useState<PivotCr | null>(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!crCode || !versionId) return;
    let annule = false;
    setLoading(true);
    setErreur(null);

    void (async () => {
      try {
        const [v, vue] = await Promise.all([
          getVersionById(versionId),
          getStatutsCrsVersion(versionId),
        ]);
        const crInfo = vue.crs.find((c) => c.crCode === crCode) ?? null;
        if (!crInfo) {
          if (!annule) setErreur('CR introuvable dans cette version.');
          return;
        }
        const items = peutVoirTout
          ? await getLignesCrComite(versionId, crCode)
          : (
              await listFaitsBudget({
                fkVersion: versionId,
                fkCentre: crInfo.crId,
                limit: 200,
              })
            ).items;
        if (annule) return;
        setVersion(v);
        setCr(crInfo);
        setPivot(construirePivotCr(agregerFaitsParCompteLigneMetier(items)));
      } catch {
        if (!annule) setErreur('Impossible de charger le document.');
      } finally {
        if (!annule) setLoading(false);
      }
    })();

    return () => {
      annule = true;
    };
  }, [crCode, versionId, peutVoirTout]);

  if (!crCode || !versionId) {
    return (
      <Message>
        Paramètres manquants : un <code>crCode</code> (URL) et un{' '}
        <code>versionId</code> (query) sont requis pour générer ce document.
      </Message>
    );
  }
  if (loading) return <Message>Génération du document…</Message>;
  if (erreur) return <Message>{erreur}</Message>;
  if (!version || !cr || !pivot) return <Message>Document indisponible.</Message>;

  const utilisateur = user ? `${user.prenom} ${user.nom}` : '—';

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white text-(--foreground)">
      {/* Barre d'actions — masquée à l'impression */}
      <div className="impression-no-print print:hidden flex items-center gap-2 mb-4">
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour
        </Button>
        <Button
          size="sm"
          className="h-9 gap-1.5 bg-(--miznas-bleu-nuit-dark) hover:bg-(--miznas-bleu-nuit-dark)/90 text-white"
          onClick={() => window.print()}
          data-testid="impression-imprimer"
        >
          <Printer className="w-3.5 h-3.5" />
          Imprimer
        </Button>
      </div>

      <EnteteImpression
        titre="Détail du Centre de Responsabilité"
        version={{ codeVersion: version.codeVersion, libelle: version.libelle }}
        dateGeneration={dateGeneration}
      />

      <BlocDetailCrImpression cr={cr} pivot={pivot} />

      <PiedPageImpression
        dateGeneration={dateGeneration}
        utilisateur={utilisateur}
      />
    </div>
  );
}
