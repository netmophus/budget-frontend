import '@testing-library/jest-dom';
import { vi } from 'vitest';

// jsdom n'implémente pas Element.prototype.scrollIntoView que Radix
// utilise au mount d'un <Select> ouvert (centrage de l'option active).
// Sans ce stub, ouvrir un Select Radix en test → TypeError → tout
// le test file plante. Pattern documenté Radix + jsdom (cf. Lot 8.2.B
// Palier 3, découverte CreerDocumentModal.test.tsx).
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}

// jsdom n'implémente pas non plus PointerEvent → Radix Select.click sur
// les items du menu ne déclenche pas l'événement attendu. Stub minimal
// pour autoriser fireEvent.click sur <SelectItem>.
if (
  typeof window !== 'undefined' &&
  !(window as { PointerEvent?: unknown }).PointerEvent
) {
  class PointerEventStub extends Event {}
  (window as unknown as { PointerEvent: unknown }).PointerEvent =
    PointerEventStub;
}
if (
  typeof HTMLElement !== 'undefined' &&
  !HTMLElement.prototype.hasPointerCapture
) {
  HTMLElement.prototype.hasPointerCapture = (): boolean => false;
}
if (
  typeof HTMLElement !== 'undefined' &&
  !HTMLElement.prototype.releasePointerCapture
) {
  HTMLElement.prototype.releasePointerCapture = (): void => {};
}

// jsdom n'implémente pas ResizeObserver. Sans ce polyfill, recharts 2.x
// `<ResponsiveContainer>` plante à l'instanciation avec
// `ReferenceError: ResizeObserver is not defined`
// (cf. recharts/lib/component/ResponsiveContainer.js). Pattern documenté
// par l'écosystème recharts + jsdom — hotfix Lot 8.5.C / fix-recharts-2x.
if (
  typeof globalThis !== 'undefined' &&
  !(globalThis as { ResizeObserver?: unknown }).ResizeObserver
) {
  class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
    ResizeObserverStub;
}
