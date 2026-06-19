/**
 * EnteteImpression — en-tête commun des documents d'impression workflow
 * CR (palier 7). Logo placeholder + organisation + référence version +
 * date de génération. Réutilisé par les 3 vues (CR / périmètre / Comité).
 */
interface EnteteImpressionProps {
  titre: string;
  version: { codeVersion: string; libelle: string };
  dateGeneration: string;
}

export function EnteteImpression({
  titre,
  version,
  dateGeneration,
}: EnteteImpressionProps): JSX.Element {
  return (
    <header className="border-b-2 border-(--miznas-bleu-nuit-dark) pb-3 mb-4">
      <div className="flex items-center gap-3">
        <img
          src="/assets/logo-fictif.svg"
          alt="Logo (placeholder)"
          width={120}
          height={48}
          className="shrink-0"
        />
        <div className="min-w-0">
          <div className="text-sm font-bold tracking-tight text-(--miznas-bleu-nuit-dark)">
            BSIC NIGER
          </div>
          <div className="text-[11px] text-(--muted-foreground)">
            Système MIZNAS — Budgétisation
          </div>
        </div>
      </div>

      <h1 className="text-lg font-semibold mt-3 mb-1">{titre}</h1>
      <div className="text-xs text-(--muted-foreground)">
        Version : <span className="font-mono">{version.codeVersion}</span> —{' '}
        {version.libelle}
      </div>
      <div className="text-[11px] text-(--muted-foreground)">
        Document généré le {dateGeneration}
      </div>
    </header>
  );
}
