import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileEdit } from 'lucide-react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { DashboardCard } from './DashboardCard';

describe('DashboardCard', () => {
  it('rend le titre, la description et l icone', () => {
    render(
      <MemoryRouter>
        <DashboardCard
          to="/cible"
          icon={FileEdit}
          title="Mon titre"
          description="Ma description"
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
});
