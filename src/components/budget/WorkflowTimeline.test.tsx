/**
 * Tests Vitest WorkflowTimeline (Lot 3.5).
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { Version } from '@/lib/api/versions';
import { WorkflowTimeline } from './WorkflowTimeline';

function makeVersion(overrides: Partial<Version> = {}): Version {
  return {
    id: '42',
    codeVersion: 'BUDGET_INITIAL_2026',
    libelle: 'Budget initial 2026',
    typeVersion: 'budget_initial',
    exerciceFiscal: 2026,
    statut: 'ouvert',
    dateGel: null,
    utilisateurGel: null,
    commentaire: null,
    dateCreation: '2026-01-01T10:00:00Z',
    utilisateurCreation: 'system',
    dateModification: null,
    utilisateurModification: null,
    commentaireSoumission: null,
    commentaireValidation: null,
    commentaireRejet: null,
    commentairePublication: null,
    dateSoumission: null,
    utilisateurSoumission: null,
    dateValidation: null,
    utilisateurValidation: null,
    dateRejet: null,
    utilisateurRejet: null,
    ...overrides,
  };
}

describe('WorkflowTimeline', () => {
  afterEach(cleanup);

  it("statut Brouillon, jamais soumis : seule l'étape « Création »", () => {
    render(<WorkflowTimeline version={makeVersion()} />);
    expect(screen.getByTestId('step-creation')).toBeInTheDocument();
    expect(screen.queryByTestId('step-soumission')).not.toBeInTheDocument();
    expect(screen.queryByTestId('step-validation')).not.toBeInTheDocument();
  });

  it('cycle complet : 4 étapes (création + soumission + validation + publication)', () => {
    render(
      <WorkflowTimeline
        version={makeVersion({
          statut: 'gele',
          dateSoumission: '2026-02-01T10:00:00Z',
          utilisateurSoumission: 'preparateur',
          dateValidation: '2026-02-15T10:00:00Z',
          utilisateurValidation: 'controleur',
          dateGel: '2026-03-01T10:00:00Z',
          utilisateurGel: 'directeur',
          commentairePublication: 'Officiel',
        })}
      />,
    );
    expect(screen.getByTestId('step-creation')).toBeInTheDocument();
    expect(screen.getByTestId('step-soumission')).toBeInTheDocument();
    expect(screen.getByTestId('step-validation')).toBeInTheDocument();
    expect(screen.getByTestId('step-publication')).toBeInTheDocument();
  });

  it('cycle rejet : étape Rejet visible avec commentaire', () => {
    render(
      <WorkflowTimeline
        version={makeVersion({
          dateRejet: '2026-02-10T10:00:00Z',
          utilisateurRejet: 'controleur',
          commentaireRejet: 'Provisions sous-évaluées',
          // dateSoumission antérieure pour respecter la chronologie.
          dateSoumission: '2026-02-01T10:00:00Z',
          utilisateurSoumission: 'preparateur',
          commentaireSoumission: 'À valider',
        })}
      />,
    );
    expect(screen.getByTestId('step-rejet')).toBeInTheDocument();
    expect(screen.getByText(/Provisions sous-évaluées/)).toBeInTheDocument();
  });

  it("ordonne les étapes chronologiquement (création < soumission < validation)", () => {
    const { container } = render(
      <WorkflowTimeline
        version={makeVersion({
          statut: 'valide',
          dateSoumission: '2026-02-01T10:00:00Z',
          dateValidation: '2026-02-10T10:00:00Z',
        })}
      />,
    );
    const steps = container.querySelectorAll('[data-testid^="step-"]');
    expect(steps[0]?.getAttribute('data-testid')).toBe('step-creation');
    expect(steps[1]?.getAttribute('data-testid')).toBe('step-soumission');
    expect(steps[2]?.getAttribute('data-testid')).toBe('step-validation');
  });

  it("affiche l'utilisateur sur chaque étape ayant une trace user", () => {
    render(
      <WorkflowTimeline
        version={makeVersion({
          dateSoumission: '2026-02-01T10:00:00Z',
          utilisateurSoumission: 'preparateur@miznas.local',
        })}
      />,
    );
    expect(
      screen.getByText(/preparateur@miznas\.local/),
    ).toBeInTheDocument();
  });
});
