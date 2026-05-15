/**
 * DashboardCard (Lot 7.3 V7 — variante C : fond pastel + cercle blanc).
 *
 * Carte pédagogique du dashboard. Chaque carte appartient à une
 * famille métier matérialisée visuellement par 3 accents :
 *  - fond de carte coloré pastel (~6 % opacité de la couleur catégorie)
 *  - cercle blanc 36 px contenant l'icône Lucide en couleur catégorie
 *  - titre dans la couleur catégorie
 *
 * Pas de bordure visible (la V6 l'avait sur le côté gauche), pas
 * d'ombre portée sauf le subtle shadow-sm du cercle blanc qui fait
 * ressortir l'icône sur le fond pastel.
 *
 * Catégories disponibles (cf. tokens `--miznas-cat-*` dans index.css) :
 *  - budget        (#0C447C) : saisie / élaboration budget
 *  - validation    (#0F6E56) : workflow validation / publication
 *  - realise       (#5B4E91) : saisie réalisé
 *  - reporting     (#BA7517) : analyse, écarts, reforecast
 *  - collaboration (#B05D3F) : délégations, échanges
 *  - config        (#5F6B7A) : admin, référentiels, audit
 *
 * Note technique : couleurs en INLINE STYLE
 * -----------------------------------------
 * Voir l'historique du fix V6.1 : `text-(--var)` et `bg-(--var)`
 * fonctionnent en Tailwind v4 mais le composé utility-fonction
 * comme `border-l-(--var)` est ambigu (width vs color) et n'est
 * pas généré. Pour la cohérence + garantie cross-utility, on
 * applique TOUTES les couleurs catégorie via inline style.
 *
 * `${hex}0F` ajoute un alpha de 0x0F (15/255 ≈ 6 %) sur la couleur
 * catégorie pour obtenir le fond pastel. JSDom et browsers modernes
 * acceptent la syntaxe hex 8-digit (#RRGGBBAA).
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
  /** Catégorie métier — pilote les 3 accents (fond, icône, titre). */
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
  const fondPastel = `${couleurHex}0F`; // alpha 0x0F ≈ 6 %
  return (
    <Link
      to={to}
      style={{ backgroundColor: fondPastel }}
      data-color={color}
      className={cn(
        'block rounded-md p-4',
        'hover:shadow-sm transition-shadow',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--primary)',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-md bg-white flex items-center justify-center flex-shrink-0 shadow-sm"
          aria-hidden="true"
        >
          <Icon
            className="w-5 h-5"
            style={{ color: couleurHex }}
            aria-hidden="true"
          />
        </div>

        <div>
          {/* <h3> pour préserver la sémantique heading (les tests
              DashboardPage existants utilisent getByRole('heading')). */}
          <h3
            className="text-sm font-medium"
            style={{ color: couleurHex }}
          >
            {title}
          </h3>
          <div className="text-xs text-(--muted-foreground) mt-1 leading-relaxed">
            {description}
          </div>
        </div>
      </div>
    </Link>
  );
}
