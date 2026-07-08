/**
 * DashboardCard (V8 — design accentué : dégradé vibrant + texte blanc).
 *
 * Carte pédagogique du dashboard. Chaque carte appartient à une famille
 * métier matérialisée par un DÉGRADÉ plein et saturé (couleurs très
 * accentuées), avec icône et texte en blanc pour un contraste fort et
 * un rendu moderne.
 *
 *  - fond : dégradé diagonal `linear-gradient(135deg, c1, c2)` (inline style)
 *  - icône Lucide blanche dans une pastille translucide (bg-white/20)
 *  - titre blanc en gras, description blanche à 85 %
 *  - hover : légère élévation (-translate-y) + ombre accentuée
 *
 * Catégories (dégradés vibrants) :
 *  - budget        : bleu → indigo
 *  - validation    : émeraude → vert
 *  - realise       : violet → pourpre
 *  - reporting     : ambre → orange
 *  - collaboration : rose → rouge
 *  - config        : cyan → bleu
 *
 * Note technique : le dégradé est appliqué en INLINE STYLE (backgroundImage)
 * car Tailwind ne génère pas de gradient dynamique à partir de valeurs hex
 * arbitraires par catégorie. `data-color` conserve la valeur logique pour
 * les tests et le ciblage éventuel.
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
  /** Catégorie métier — pilote le dégradé de la carte. */
  color: DashboardCardColor;
  /** Classes Tailwind additionnelles (utilisé pour delays d'animation). */
  className?: string;
}

/** Dégradés vibrants par catégorie (couleurs très accentuées). */
const GRADIENTS: Record<DashboardCardColor, [string, string]> = {
  budget: ['#3b82f6', '#4f46e5'],
  validation: ['#10b981', '#059669'],
  realise: ['#8b5cf6', '#6d28d9'],
  reporting: ['#f59e0b', '#ea580c'],
  collaboration: ['#fb7185', '#e11d48'],
  config: ['#06b6d4', '#0891b2'],
};

export function DashboardCard({
  to,
  icon: Icon,
  title,
  description,
  color,
  className,
}: DashboardCardProps) {
  const [c1, c2] = GRADIENTS[color];
  return (
    <Link
      to={to}
      data-color={color}
      style={{ backgroundImage: `linear-gradient(135deg, ${c1}, ${c2})` }}
      className={cn(
        'group block rounded-xl p-4 text-white shadow-lg',
        'transition-all hover:-translate-y-0.5 hover:shadow-xl',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/20 shadow-sm transition-transform group-hover:scale-110"
          aria-hidden="true"
        >
          <Icon className="h-5 w-5 text-white" aria-hidden="true" />
        </div>

        <div>
          {/* <h3> pour préserver la sémantique heading (les tests
              DashboardPage existants utilisent getByRole('heading')). */}
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <div className="mt-1 text-sm leading-relaxed text-white/90">
            {description}
          </div>
        </div>
      </div>
    </Link>
  );
}
