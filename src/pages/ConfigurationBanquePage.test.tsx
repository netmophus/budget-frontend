import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/configurationBanque', () => ({
  getConfigurationBanque: vi.fn(),
  updateConfigurationBanque: vi.fn(),
}));
vi.mock('@/lib/auth/permissions', () => ({ useHasPermission: () => true }));
vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));
// Éditeur de membres stubé — testé séparément.
vi.mock('@/components/admin/config-banque/MembresComiteEditor', () => ({
  MembresComiteEditor: () => <div data-testid="membres-editor-stub" />,
}));

import {
  getConfigurationBanque,
  updateConfigurationBanque,
  type ConfigurationBanque,
} from '@/lib/api/configurationBanque';
import { ConfigurationBanquePage } from './ConfigurationBanquePage';

const mockGet = getConfigurationBanque as unknown as ReturnType<typeof vi.fn>;
const mockUpdate = updateConfigurationBanque as unknown as ReturnType<
  typeof vi.fn
>;

const CONFIG: ConfigurationBanque = {
  nom: 'BSIC NIGER',
  sigle: 'BSIC',
  nomCommercialComplet: 'Banque Sahélo-Saharienne',
  formeJuridique: 'SA',
  groupe: 'Groupe BSIC',
  siegeSocial: 'Boulevard de la Liberté',
  villeSiege: 'Niamey',
  pays: 'Niger',
  telephone: null,
  emailContact: null,
  refReglementaireBceao: null,
  exerciceFiscalLibelle: null,
  couleurPrimaire: '#1B2A4E',
  couleurPrimaireDark: '#0F1B33',
  couleurSecondaire: '#C49B3F',
  logoRef: null,
  contexteMarche: null,
  concurrents: null,
  positionnement: null,
  membres: [],
};

describe('ConfigurationBanquePage (Lot B4)', () => {
  beforeEach(() => {
    mockGet.mockResolvedValue({ ...CONFIG });
    mockUpdate.mockResolvedValue({ ...CONFIG });
  });
  afterEach(() => {
    vi.clearAllMocks();
    cleanup();
  });

  it('charge et affiche la configuration (nom pré-rempli)', async () => {
    render(<ConfigurationBanquePage />);
    await waitFor(() =>
      expect(screen.getByTestId('nom')).toHaveValue('BSIC NIGER'),
    );
    expect(screen.getByTestId('couleurPrimaire')).toHaveValue('#1B2A4E');
  });

  it('Enregistrer → confirmation → appelle updateConfigurationBanque', async () => {
    render(<ConfigurationBanquePage />);
    await waitFor(() => screen.getByTestId('nom'));

    // Modifie le nom.
    fireEvent.change(screen.getByTestId('nom'), {
      target: { value: 'ECOBANK NIGER' },
    });
    fireEvent.click(screen.getByTestId('btn-enregistrer'));

    // Le dialog de confirmation apparaît, on confirme.
    const boutons = await screen.findAllByRole('button', {
      name: 'Enregistrer',
    });
    fireEvent.click(boutons[boutons.length - 1]);

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ nom: 'ECOBANK NIGER' }),
    );
  });

  it('désactive Enregistrer si une couleur est invalide', async () => {
    render(<ConfigurationBanquePage />);
    await waitFor(() => screen.getByTestId('couleurPrimaire'));
    fireEvent.change(screen.getByTestId('couleurPrimaire'), {
      target: { value: 'pasunecouleur' },
    });
    expect(screen.getByTestId('btn-enregistrer')).toBeDisabled();
  });
});
