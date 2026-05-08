/**
 * Tabs minimaliste maison (Lot 5.3.B) — pas de Radix pour respecter
 * la contrainte "aucune nouvelle dépendance npm". État interne
 * contrôlable via `value` + `onChange`.
 */
import { type ReactNode, useState } from 'react';

interface TabItem {
  value: string;
  label: ReactNode;
  content: ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  defaultValue?: string;
  value?: string;
  onChange?: (v: string) => void;
}

export function Tabs({
  tabs,
  defaultValue,
  value,
  onChange,
}: TabsProps): JSX.Element {
  const [internal, setInternal] = useState<string>(
    defaultValue ?? tabs[0]?.value ?? '',
  );
  const current = value ?? internal;
  const active = tabs.find((t) => t.value === current) ?? tabs[0];

  function handleClick(v: string): void {
    if (value === undefined) setInternal(v);
    onChange?.(v);
  }

  return (
    <div data-testid="tabs">
      <div
        role="tablist"
        className="flex gap-1 border-b border-(--border) mb-4"
      >
        {tabs.map((t) => (
          <button
            key={t.value}
            role="tab"
            aria-selected={t.value === current}
            data-testid={`tab-${t.value}`}
            onClick={() => handleClick(t.value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              t.value === current
                ? 'border-(--primary) text-(--foreground)'
                : 'border-transparent text-(--muted-foreground) hover:text-(--foreground)'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" data-testid={`tabpanel-${active?.value}`}>
        {active?.content}
      </div>
    </div>
  );
}
