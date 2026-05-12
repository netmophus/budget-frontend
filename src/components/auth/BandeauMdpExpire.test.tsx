/**
 * Tests Vitest BandeauMdpExpire (Lot 6.7.1).
 */
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useAuthStore } from '@/lib/auth/auth-store';
import { BandeauMdpExpire } from './BandeauMdpExpire';

function setStore(partial: Partial<ReturnType<typeof useAuthStore.getState>>) {
  useAuthStore.setState(partial);
}

function renderBandeau() {
  return render(
    <MemoryRouter>
      <BandeauMdpExpire />
    </MemoryRouter>,
  );
}

describe('BandeauMdpExpire', () => {
  beforeEach(() => {
    setStore({ mdpExpireProchainement: false });
  });
  afterEach(() => cleanup());

  it('affiche le bandeau quand mdpExpireProchainement = true', () => {
    setStore({ mdpExpireProchainement: true });
    renderBandeau();
    expect(screen.getByTestId('bandeau-mdp-expire')).toBeInTheDocument();
    expect(screen.getByText(/expire dans moins de 7 jours/i)).toBeInTheDocument();
  });

  it("n'affiche rien quand mdpExpireProchainement = false", () => {
    setStore({ mdpExpireProchainement: false });
    renderBandeau();
    expect(screen.queryByTestId('bandeau-mdp-expire')).not.toBeInTheDocument();
  });

  it('le lien "Changer maintenant" pointe vers /change-mdp', () => {
    setStore({ mdpExpireProchainement: true });
    renderBandeau();
    expect(screen.getByTestId('bandeau-mdp-expire-lien')).toHaveAttribute(
      'href',
      '/change-mdp',
    );
  });
});
