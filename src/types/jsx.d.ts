/**
 * Shim JSX global (Lot 6.6.B-11)
 *
 * React 19 a deprecie le namespace JSX global. Le code existant
 * utilise extensively `JSX.Element` comme type de retour des
 * composants (pattern React 18 idiomatique).
 *
 * Ce shim re-expose JSX comme alias de React.JSX pour eviter un
 * refactor massif de 59 occurrences avec risque de regression UI.
 *
 * Dette tracee pour Lot 7+ (modernisation UI) : migration vers
 * React.ReactElement / FC en commit dedie.
 */
import 'react';

declare global {
  namespace JSX {
    type Element = React.JSX.Element;
    type ElementType = React.JSX.ElementType;
    type ElementClass = React.JSX.ElementClass;
    type IntrinsicElements = React.JSX.IntrinsicElements;
    type IntrinsicAttributes = React.JSX.IntrinsicAttributes;
    type IntrinsicClassAttributes<T> = React.JSX.IntrinsicClassAttributes<T>;
    type ElementAttributesProperty = React.JSX.ElementAttributesProperty;
    type ElementChildrenAttribute = React.JSX.ElementChildrenAttribute;
    type LibraryManagedAttributes<C, P> = React.JSX.LibraryManagedAttributes<
      C,
      P
    >;
  }
}
