/**
 * DashboardCard (Lot 7.3 V6.1 — fix coloration via inline style).
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
 *
 * Note technique — pourquoi inline style et pas classes Tailwind
 * --------------------------------------------------------------
 * La V6 initiale utilisait `border-l-(--miznas-cat-X)` et
 * `text-(--miznas-cat-X)` mappées via un objet `COLOR_CLASSES`. Bien
 * que `text-(--var)` et `bg-(--var)` fonctionnent en Tailwind v4
 * (utilities 100 % color, pas d'ambiguïté), `border-l-(--var)` est
 * ambigu (width vs color) et n'est pas généré par le scanner — la
 * CSS finale ne contient pas la règle, donc rien ne s'affiche. Faux
 * positif des tests Vitest : ils vérifient la className en string
 * mais pas la CSS générée.
 *
 * Solution : double source de vérité acceptée (hex dans index.css
 * pour la doc + hex ici pour le rendu garanti). 6 valeurs fixes,
 * couplage faible, pas de dépendance Tailwind purge.
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

/**
 * Mapping color → hex. À garder synchronisé avec les tokens
 * `--miznas-cat-*` dans `src/index.css` (source de vérité documentée).
 */
const COLOR_VALUES: Record<DashboardCardColor, string> = {
  budget: '#0C447C',
  validation: '#0F6E56',
  realise: '#5B4E91',
  reporting: '#BA7517',
  collaboration: '#B05D3F',
  config: '#5F6B7A',
};

export function DashboardCard({
  to,
  icon: Icon,
  title,
  description,
  color,
  className,
}: DashboardCardProps) {
  const couleurHex = COLOR_VALUES[color];
  return (
    <Link
      to={to}
      style={{ borderLeftColor: couleurHex }}
      data-color={color}
      className={cn(
        'block bg-white border border-(--border) border-l-[3px]',
        'rounded-md p-4',
        'hover:shadow-sm transition-shadow',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--primary)',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <Icon
          className="w-6 h-6 flex-shrink-0"
          style={{ color: couleurHex }}
          aria-hidden="true"
        />
        <div>
          {/* <h3> pour préserver la sémantique heading (les tests
              DashboardPage existants utilisent getByRole('heading')). */}
          <h3 className="text-sm font-medium">{title}</h3>
          <div className="text-xs text-(--muted-foreground) mt-1 leading-relaxed">
            {description}
          </div>
        </div>
      </div>
    </Link>
  );
}
