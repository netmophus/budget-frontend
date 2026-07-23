/**
 * PiedPageImpression — pied de page commun des documents d'impression
 * workflow CR (palier 7). Traçabilité (auteur + date) + mention d'usage.
 */
import { useBanque } from '@/lib/branding/banque-context';

interface PiedPageImpressionProps {
  dateGeneration: string;
  utilisateur: string;
}

export function PiedPageImpression({
  dateGeneration,
  utilisateur,
}: PiedPageImpressionProps): JSX.Element {
  const { banque } = useBanque();
  return (
    <footer className="border-t border-(--border) mt-6 pt-2 text-[10px] text-(--muted-foreground)">
      <div>
        Document généré le {dateGeneration} par {utilisateur}.
      </div>
      <div>
        {banque.nom} — Système MIZNAS — Document à usage interne, pour examen
        en Comité Budget.
      </div>
    </footer>
  );
}
