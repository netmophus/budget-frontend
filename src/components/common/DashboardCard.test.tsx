/**
 * Tests DashboardCard (Lot 7.3 V7 — variante C : fond pastel).
 *
 * Couvre :
 *  - Rendu basique : titre + description + lien correctement câblé
 *    + navigation cliquable
 *  - Mapping color → fond pastel (background-color avec ~6 % alpha)
 *    + icône colorée (svg style.color) + titre coloré (h3 style.color)
 *  - Cercle blanc 36 px autour de l'icône
 *  - Propagation de `className` additionnelle (delays d'animation)
 *  - Icône Lucide aria-hidden (purement décorative)
 */
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Coins, FileEdit, Settings } from 'lucide-react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';

import {
  DashboardCard,
  type DashboardCardColor,
} from './DashboardCard';

describe('DashboardCard', () => {
  afterEach(() => cleanup());

  it('rend le titre, la description et l\'icône', () => {
    render(
      <MemoryRouter>
        <DashboardCard
          to="/cible"
          icon={FileEdit}
          title="Mon titre"
          description="Ma description"
          color="budget"
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { level: 3, name: 'Mon titre' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Ma description')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/cible');
  });

  it('navigue vers le chemin to au clic', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={
              <DashboardCard
                to="/cible"
                icon={FileEdit}
                title="Carte"
                description="Description"
                color="budget"
              />
            }
          />
          <Route path="/cible" element={<div>Page cible</div>} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('link', { name: /Carte/i }));
    expect(screen.getByText('Page cible')).toBeInTheDocument();
  });

  // Note V7 : on teste les valeurs hex appliquées en INLINE STYLE
  // - link.style.backgroundColor : couleur catégorie + alpha (~6 %)
  // - svg.style.color            : couleur catégorie pure
  // - h3.style.color             : couleur catégorie pure
  // Les patterns sont tolérants (rgb / rgba / hex) car JSDom peut
  // normaliser `#RRGGBBAA` en `rgba(R, G, B, 0.06)` selon la version.
  it.each([
    [
      'budget',
      // Couleur pure (icône, titre)
      /(rgb\(12,\s*68,\s*124\)|#0c447c)$/i,
      // Couleur + alpha (fond pastel)
      /background-color:\s*(rgba?\(12,\s*68,\s*124|#0c447c)/i,
    ],
    [
      'validation',
      /(rgb\(15,\s*110,\s*86\)|#0f6e56)$/i,
      /background-color:\s*(rgba?\(15,\s*110,\s*86|#0f6e56)/i,
    ],
    [
      'config',
      /(rgb\(95,\s*107,\s*122\)|#5f6b7a)$/i,
      /background-color:\s*(rgba?\(95,\s*107,\s*122|#5f6b7a)/i,
    ],
  ] as const)(
    'color=%s → fond pastel + icône + titre stylés via inline style',
    (color: DashboardCardColor, patternPure: RegExp, patternBg: RegExp) => {
      render(
        <MemoryRouter>
          <DashboardCard
            to="/x"
            icon={FileEdit}
            title="Mon titre"
            description="d"
            color={color}
          />
        </MemoryRouter>,
      );
      const link = screen.getByRole('link');

      // Fond pastel via style inline (background-color avec alpha)
      expect(link.getAttribute('style')).toMatch(patternBg);

      // data-color permet de vérifier la valeur logique
      expect(link.getAttribute('data-color')).toBe(color);

      // Icône Lucide en couleur catégorie pure
      const svg = link.querySelector('svg');
      expect(svg).not.toBeNull();
      // svg.style.color renvoie la valeur résolue ; on matche depuis
      // la fin de la chaîne (car style sérialise "color: …")
      expect(svg?.style.color).toMatch(patternPure);

      // Titre <h3> en couleur catégorie pure
      const heading = screen.getByRole('heading', { name: 'Mon titre' });
      expect(heading.style.color).toMatch(patternPure);
    },
  );

  it('rend un cercle blanc 36 px autour de l\'icône (rounded-md bg-white)', () => {
    render(
      <MemoryRouter>
        <DashboardCard
          to="/x"
          icon={FileEdit}
          title="t"
          description="d"
          color="reporting"
        />
      </MemoryRouter>,
    );
    const link = screen.getByRole('link');
    // Le cercle blanc est le wrapper direct de l'<svg> de l'icône.
    const svg = link.querySelector('svg');
    const circle = svg?.parentElement;
    expect(circle).not.toBeNull();
    expect(circle?.className).toContain('rounded-md');
    expect(circle?.className).toContain('bg-white');
    expect(circle?.className).toContain('w-9');
    expect(circle?.className).toContain('h-9');
  });

  it('rend les classes structurelles permanentes (rounded-md, p-4)', () => {
    render(
      <MemoryRouter>
        <DashboardCard
          to="/x"
          icon={FileEdit}
          title="t"
          description="d"
          color="reporting"
        />
      </MemoryRouter>,
    );
    const link = screen.getByRole('link');
    expect(link.className).toContain('rounded-md');
    expect(link.className).toContain('p-4');
    // V7 : pas de bordure visible (suppression de border-l-[3px] et
    // border-(--border) introduits en V6).
    expect(link.className).not.toContain('border-l-[3px]');
  });

  it('propage la className additionnelle (delays d\'animation par exemple)', () => {
    render(
      <MemoryRouter>
        <DashboardCard
          to="/test"
          icon={Coins}
          title="Test"
          description="desc"
          color="reporting"
          className="animate-in fade-in delay-200"
        />
      </MemoryRouter>,
    );
    const link = screen.getByRole('link');
    expect(link.className).toContain('animate-in');
    expect(link.className).toContain('fade-in');
    expect(link.className).toContain('delay-200');
    // Les classes par défaut restent (cn ne les écrase pas).
    expect(link.className).toContain('rounded-md');
  });

  it('rend l\'icône Lucide avec aria-hidden (purement décorative)', () => {
    render(
      <MemoryRouter>
        <DashboardCard
          to="/admin"
          icon={Settings}
          title="Admin"
          description="desc"
          color="config"
        />
      </MemoryRouter>,
    );
    const svg = screen.getByRole('link').querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });
});
