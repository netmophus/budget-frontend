/**
 * ImpressionPerimetrePage (/budget/validations/impression?versionId=…) —
 * vue d'impression standalone (HORS layout) du périmètre d'un validateur :
 * page 1 récap (CR du périmètre) puis 1 page par CR (détail réutilisé du
 * palier 7.1).
 *
 * Permission : BUDGET.VALIDER. Filtrage périmètre via
 * GET /budget/version/:id/statuts-crs?monPerimetre=true. Lignes par CR via
 * l'endpoint Comité perimeter-free (l'appelant est validateur).
 */
import { ArrowLeft, Printer } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import {
  getLignesCrComite,
  getStatutsCrsVersion,
  type CrStatutLigne,
} from '@/lib/api/cr-workflow';
import { getVersionById, type Version } from '@/lib/api/versions';
import { useAuthStore } from '@/lib/auth/auth-store';
import {
  agregerFaitsParCompteLigneMetier,
  construirePivotCr,
  type PivotCr,
} from '@/features/budget/lib/agregation-cr';
import { BlocDetailCrImpression } from './BlocDetailCrImpression';
import { EnteteImpression } from './EnteteImpression';
import { PiedPageImpression } from './PiedPageImpression';
import { TableauRecapCrsImpression } from './TableauRecapCrsImpression';
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

interface BlocCr {
  cr: CrStatutLigne;
  pivot: PivotCr;
}

export function ImpressionPerimetrePage(): JSX.Element {
  const [params] = useSearchParams();
  const versionId = params.get('versionId');
  const navigate = useNavigate();

  const user = useAuthStore((s) => s.user);
  const dateGeneration = useMemo(() => maintenantFr(), []);

  const [version, setVersion] = useState<Version | null>(null);
  const [crs, setCrs] = useState<CrStatutLigne[]>([]);
  const [blocs, setBlocs] = useState<BlocCr[]>([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!versionId) return;
    let annule = false;
    setLoading(true);
    setErreur(null);

    void (async () => {
      try {
        const [v, vue] = await Promise.all([
          getVersionById(versionId),
          getStatutsCrsVersion(versionId, true),
        ]);
        const detail = await Promise.all(
          vue.crs.map(async (cr) => {
            const items = await getLignesCrComite(versionId, cr.crCode);
            return {
              cr,
              pivot: construirePivotCr(agregerFaitsParCompteLigneMetier(items)),
            };
          }),
        );
        if (annule) return;
        setVersion(v);
        setCrs(vue.crs);
        setBlocs(detail);
      } catch {
        if (!annule) setErreur('Impossible de charger le document.');
      } finally {
        if (!annule) setLoading(false);
      }
    })();

    return () => {
      annule = true;
    };
  }, [versionId]);

  if (!versionId) {
    return (
      <Message>
        Paramètre manquant : un <code>versionId</code> (query) est requis.
      </Message>
    );
  }
  if (loading) return <Message>Génération du document…</Message>;
  if (erreur) return <Message>{erreur}</Message>;
  if (!version) return <Message>Document indisponible.</Message>;

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

      {/* Page 1 — récap périmètre */}
      <EnteteImpression
        titre={`Périmètre de validation — ${utilisateur}`}
        version={{ codeVersion: version.codeVersion, libelle: version.libelle }}
        dateGeneration={dateGeneration}
      />
      <p className="text-xs text-(--muted-foreground) mb-3">
        {crs.length} CR à valider pour {version.codeVersion} — {version.libelle}.
      </p>
      {crs.length === 0 ? (
        <Message>Aucun CR dans votre périmètre pour cette version.</Message>
      ) : (
        <TableauRecapCrsImpression crs={crs} />
      )}

      {/* Pages suivantes — 1 page par CR */}
      {blocs.map(({ cr, pivot }) => (
        <div key={cr.crId} className="impression-saut-page">
          <BlocDetailCrImpression cr={cr} pivot={pivot} />
        </div>
      ))}

      <PiedPageImpression
        dateGeneration={dateGeneration}
        utilisateur={utilisateur}
      />
    </div>
  );
}
