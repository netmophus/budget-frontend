/**
 * DashboardCard (Lot 7.3 V6 — coloration par catégorie métier).
 *
 * Carte pédagogique du dashboard. Chaque carte appartient à une
 * famille métier matérialisée par 2 accents visuels permanents :
 *  - border-left 3 px de la couleur catégorie (toujours visible)
 *  - icône Lucide dans la couleur catégorie (toujours visible)
 *
 * Catégories disponibles (cf. tokens `--miznas-cat-*` dans index.css) :
 *  - budget        (#0C447C) : saisie / élaboration budget
 *  - validation    (#0F6E56) : workflow validation / publication
 *  - realise       (#5B4E91) : saisie réalisé
 *  - reporting     (#BA7517) : analyse, écarts, reforecast
 *  - collaboration (#B05D3F) : délégations, échanges
 *  - config        (#5F6B7A) : admin, référentiels, audit
 */
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

import { cn } from '@/lib/utils';

export type DashboardCardColor =
  | 'budget'
  | 'validation'
  | 'realise'
  | 'reporting'
  | 'collaboration'
  | 'config';

interface DashboardCardProps {
  to: string;
  icon: LucideIcon;
  title: string;
  description: string;
  /** Catégorie métier — pilote la couleur de bordure gauche + icône. */
  color: DashboardCardColor;
  /** Classes Tailwind additionnelles (utilisé pour delays d'animation). */
  className?: string;
}

const COLOR_CLASSES: Record<
  DashboardCardColor,
  { border: string; icon: string }
> = {
  budget: {
    border: 'border-l-(--miznas-cat-budget)',
    icon: 'text-(--miznas-cat-budget)',
  },
  validation: {
    border: 'border-l-(--miznas-cat-validation)',
    icon: 'text-(--miznas-cat-validation)',
  },
  realise: {
    border: 'border-l-(--miznas-cat-realise)',
    icon: 'text-(--miznas-cat-realise)',
  },
  reporting: {
    border: 'border-l-(--miznas-cat-reporting)',
    icon: 'text-(--miznas-cat-reporting)',
  },
  collaboration: {
    border: 'border-l-(--miznas-cat-collaboration)',
    icon: 'text-(--miznas-cat-collaboration)',
  },
  config: {
    border: 'border-l-(--miznas-cat-config)',
    icon: 'text-(--miznas-cat-config)',
  },
};

export function DashboardCard({
  to,
  icon: Icon,
  title,
  description,
  color,
  className,
}: DashboardCardProps) {
  const colorCls = COLOR_CLASSES[color];
  return (
    <Link
      to={to}
      className={cn(
        'block bg-white border border-(--border) border-l-[3px]',
        colorCls.border,
        'rounded-md p-4',
        'hover:shadow-sm transition-shadow',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--primary)',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <Icon
          className={cn('w-6 h-6 flex-shrink-0', colorCls.icon)}
          aria-hidden="true"
        />
        <div>
          {/* <h3> pour préserver la sémantique heading (les tests
              DashboardPage existants utilisent getByRole('heading'))
              — le style charte v1 est strictement identique à un
              <div> grâce au reset Tailwind. */}
          <h3 className="text-sm font-medium">{title}</h3>
          <div className="text-xs text-(--muted-foreground) mt-1 leading-relaxed">
            {description}
          </div>
        </div>
      </div>
    </Link>
  );
}
