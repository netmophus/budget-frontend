/**
 * Tests Vitest helper filtrerLignes du store tableau de bord
 * (Lot 5.2.C). Couvre filtre rapide niveau + recherche texte
 * combinés.
 */
import { describe, expect, it } from 'vitest';

import { filtrerLignes } from './tableau-bord-store';

const lignes = [
  { codeCr: 'CR_BANDABARI', codeCompte: '6111', niveauAlerte: 'CRITIQUE' as const },
  { codeCr: 'CR_BANDABARI', codeCompte: '6112', niveauAlerte: 'NORMAL' as const },
  { codeCr: 'CR_DOSSO', codeCompte: '7011', niveauAlerte: 'ATTENTION' as const },
  { codeCr: 'CR_DOSSO', codeCompte: '7012', niveauAlerte: 'MANQUANT' as const },
];

describe('filtrerLignes', () => {
  it('TOUS sans recherche : renvoie toutes les lignes', () => {
    expect(filtrerLignes(lignes, 'TOUS', '')).toHaveLength(4);
  });

  it('filtre rapide CRITIQUE : ne renvoie que les critiques', () => {
    const r = filtrerLignes(lignes, 'CRITIQUE', '');
    expect(r).toHaveLength(1);
    expect((r[0] as { codeCompte: string }).codeCompte).toBe('6111');
  });

  it('filtre rapide MANQUANT : ne renvoie que les manquants', () => {
    const r = filtrerLignes(lignes, 'MANQUANT', '');
    expect(r).toHaveLength(1);
    expect((r[0] as { codeCompte: string }).codeCompte).toBe('7012');
  });

  it('recherche texte sur codeCompte : match partiel insensible casse', () => {
    const r = filtrerLignes(lignes, 'TOUS', '6111');
    expect(r).toHaveLength(1);
    expect((r[0] as { codeCompte: string }).codeCompte).toBe('6111');
  });

  it('recherche texte sur codeCr : match insensible casse', () => {
    const r = filtrerLignes(lignes, 'TOUS', 'dosso');
    expect(r).toHaveLength(2);
  });

  it('combine filtre rapide + recherche : intersection', () => {
    const r = filtrerLignes(lignes, 'ATTENTION', 'cr_dosso');
    expect(r).toHaveLength(1);
    expect((r[0] as { codeCompte: string }).codeCompte).toBe('7011');
  });

  it('aucun match : tableau vide', () => {
    expect(filtrerLignes(lignes, 'TOUS', 'inexistant')).toHaveLength(0);
  });
});
