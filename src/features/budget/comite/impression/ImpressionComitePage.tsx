/**
 * ImpressionComitePage (/budget/comite/impression?versionId=…) — vue
 * d'impression standalone (HORS layout) de toute la version pour le
 * Comité :
 *   page 1 : consolidation PNB/RN/CE/CR/Zinder vs cibles D2 + synthèse ;
 *   page 2 : tableau de tous les CR validés (sans filtre périmètre) ;
 *   pages suivantes : 1 page par CR validé (détail réutilisé du 7.1).
 *
 * Permission : BUDGET.VALIDER. PAS de filtre périmètre (le Comité voit
 * toute la version).
 */
import { ArrowLeft, Printer } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import {
  getLignesCrComite,
  getStatutsCrsVersion,
  type CrStatutLigne,
  type StatutsCrsVersion,
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
import { TableauConsolideD2Impression } from './TableauConsolideD2Impression';
import { TableauRecapCrsImpression } from './TableauRecapCrsImpression';
import './impression.css';

const FMT = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

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

export function ImpressionComitePage(): JSX.Element {
  const [params] = useSearchParams();
  const versionId = params.get('versionId');
  const navigate = useNavigate();

  const user = useAuthStore((s) => s.user);
  const dateGeneration = useMemo(() => maintenantFr(), []);

  const [version, setVersion] = useState<Version | null>(null);
  const [vue, setVue] = useState<StatutsCrsVersion | null>(null);
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
        // Vue globale (sans monPerimetre) : le Comité voit toute la version.
        const [v, statuts] = await Promise.all([
          getVersionById(versionId),
          getStatutsCrsVersion(versionId),
        ]);
        const crsValides = statuts.crs.filter((c) => c.statut === 'VALIDE');
        const detail = await Promise.all(
          crsValides.map(async (cr) => {
            const items = await getLignesCrComite(versionId, cr.crCode);
            return {
              cr,
              pivot: construirePivotCr(agregerFaitsParCompteLigneMetier(items)),
            };
          }),
        );
        if (annule) return;
        setVersion(v);
        setVue(statuts);
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
  if (!version || !vue) return <Message>Document indisponible.</Message>;

  const utilisateur = user ? `${user.prenom} ${user.nom}` : '—';
  const crsValides = vue.crs.filter((c) => c.statut === 'VALIDE');
  const pnbConsolide = vue.crs.reduce((s, c) => s + c.pnb, 0);

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

      {/* Page 1 — récap consolidé */}
      <EnteteImpression
        titre={`Budget consolidé — ${version.codeVersion}`}
        version={{ codeVersion: version.codeVersion, libelle: version.libelle }}
        dateGeneration={dateGeneration}
      />
      <p className="text-xs font-medium mb-3">Vue Comité Budget — Arbitrage</p>

      <h2 className="text-sm font-semibold mb-2">Consolidation vs cibles D2</h2>
      <TableauConsolideD2Impression pnbConsolide={pnbConsolide} />
      <p className="text-[10px] text-(--muted-foreground) mt-1">
        Seul le PNB est consolidé à ce jour. RN / CE / CR / Zinder : cibles de
        référence (consolidation détaillée à venir).
      </p>

      <div className="flex flex-wrap gap-3 mt-3 text-xs">
        <div className="rounded-md border border-(--border) px-3 py-1.5">
          CR validés :{' '}
          <strong className="tabular-nums">
            {vue.nbValides} / {vue.totalAttendus}
          </strong>
        </div>
        <div className="rounded-md border border-(--miznas-bleu-nuit-dark)/30 bg-(--miznas-bleu-nuit-dark)/5 px-3 py-1.5">
          PNB consolidé :{' '}
          <strong className="tabular-nums">{FMT.format(pnbConsolide)}</strong>
        </div>
      </div>

      {/* Page 2 — tableau de tous les CR validés */}
      <div className="impression-saut-page">
        <h2 className="text-sm font-semibold mb-2">
          CR validés ({crsValides.length})
        </h2>
        {crsValides.length === 0 ? (
          <Message>Aucun CR validé pour cette version.</Message>
        ) : (
          <TableauRecapCrsImpression crs={crsValides} />
        )}
      </div>

      {/* Pages suivantes — 1 page par CR validé */}
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
