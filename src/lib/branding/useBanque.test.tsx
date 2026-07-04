import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/configurationBanque', () => ({
  getConfigurationPublique: vi.fn(),
}));

import { getConfigurationPublique } from '@/lib/api/configurationBanque';
import { useBanque } from './banque-context';
import { BanqueProvider } from './useBanque';

const mockGet = getConfigurationPublique as unknown as ReturnType<typeof vi.fn>;

function Consumer() {
  const { banque } = useBanque();
  return <div data-testid="nom">{banque.nom}</div>;
}

afterEach(() => {
  vi.clearAllMocks();
  cleanup();
});

describe('BanqueProvider (branding runtime, Lot B4)', () => {
  it('affiche le splash pendant le fetch initial', () => {
    mockGet.mockReturnValue(new Promise(() => {})); // jamais résolu
    render(
      <BanqueProvider>
        <Consumer />
      </BanqueProvider>,
    );
    expect(screen.getByTestId('banque-splash')).toBeInTheDocument();
    expect(screen.queryByTestId('nom')).not.toBeInTheDocument();
  });

  it('expose la config fetchée une fois chargée', async () => {
    mockGet.mockResolvedValue({
      nom: 'ECOBANK NIGER',
      sigle: 'ECO',
      nomCommercialComplet: 'Ecobank Niger',
      villeSiege: 'Niamey',
      pays: 'Niger',
      couleurPrimaire: '#005B2F',
      couleurPrimaireDark: '#00381D',
      couleurSecondaire: '#7AC143',
      logoRef: null,
    });
    render(
      <BanqueProvider>
        <Consumer />
      </BanqueProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('nom')).toHaveTextContent('ECOBANK NIGER'),
    );
  });

  it('retombe sur le fallback BSIC NIGER si le fetch échoue', async () => {
    mockGet.mockRejectedValue(new Error('network'));
    render(
      <BanqueProvider>
        <Consumer />
      </BanqueProvider>,
    );
    await waitFor(() =>
      expect(screen.getByTestId('nom')).toHaveTextContent('BSIC NIGER'),
    );
  });
});
