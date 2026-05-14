/**
 * MiznasWordmark (Lot 7.3) — composant atomique du wordmark
 * identitaire MIZNAS, réutilisable sur toutes les surfaces où la
 * marque doit apparaître (zone identité PublicLayout, header
 * AuthLayout, mentions légales, etc.).
 *
 * Charte v1 stricte :
 *  - Typo seule, pas de logogramme
 *  - Couleur : bleu nuit `--miznas-bleu-nuit` (#0C447C)
 *  - Weight : 700
 *  - Letter-spacing : -0.03em (serré, signature charte)
 *  - leading-none (pas de respiration verticale parasite)
 *
 * Tailles disponibles (cohérence inter-pages) :
 *   sm  → text-xl   (20px)  badge / mention footer
 *   md  → text-3xl  (30px)  header AuthLayout, défaut
 *   lg  → text-5xl  (48px)  page d'erreur, splash
 *   xl  → text-6xl  (60px)  zone identité PublicLayout (cible /login)
 */
import { cn } from '@/lib/utils';

export type MiznasWordmarkSize = 'sm' | 'md' | 'lg' | 'xl';

interface MiznasWordmarkProps {
  size?: MiznasWordmarkSize;
  className?: string;
}

const SIZE_CLASSES: Record<MiznasWordmarkSize, string> = {
  sm: 'text-xl',
  md: 'text-3xl',
  lg: 'text-5xl',
  xl: 'text-6xl',
};

export function MiznasWordmark({
  size = 'md',
  className,
}: MiznasWordmarkProps) {
  return (
    <span
      className={cn(
        // Ordre important : tailwind-merge fusionne `text-{size}` avec
        // `leading-*` (les deux relèvent du sous-groupe "typography"
        // dans son default config). On place `leading-none` APRÈS la
        // taille pour qu'il l'emporte sur le line-height implicite.
        'font-bold tracking-[-0.03em] text-(--miznas-bleu-nuit)',
        SIZE_CLASSES[size],
        'leading-none',
        className,
      )}
      data-testid="miznas-wordmark"
    >
      MIZNAS
    </span>
  );
}
