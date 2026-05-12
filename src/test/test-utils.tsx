/* eslint-disable react-refresh/only-export-components -- test utility ; ce fichier n'est jamais HMR/Fast-Refresh, le mélange composant + re-exports est intentionnel. */
/**
 * Lot 6.7.2 — helper render qui wrap avec <TooltipProvider> pour
 * que les composants utilisant <Tooltip> de Radix soient rendus
 * correctement en test (sinon Radix lève "An error occurred in
 * the <Tooltip> component" car le contexte Provider est absent).
 *
 * En production le <TooltipProvider> est placé racine dans App.tsx.
 * Cet helper recrée la même portée pour le rendu de tests isolés.
 *
 * Usage :
 *   import { render } from '@/test/test-utils';
 *   render(<MyComponent />);
 *
 * Pour combiner avec d'autres wrappers (MemoryRouter, etc.),
 * compose-les autour de l'enfant directement.
 */
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  render as rtlRender,
  type RenderOptions,
  type RenderResult,
} from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';

// delayDuration=0 en test : déclenche le Tooltip immédiatement au
// hover (sinon Radix attend 700ms par défaut → tests flaky).
const TestTooltipProvider = ({ children }: { children: ReactNode }) => (
  <TooltipProvider delayDuration={0}>{children}</TooltipProvider>
);

export function render(
  ui: ReactElement,
  options?: RenderOptions,
): RenderResult {
  return rtlRender(ui, { wrapper: TestTooltipProvider, ...options });
}

export * from '@testing-library/react';
