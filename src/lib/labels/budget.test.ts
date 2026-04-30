import { describe, expect, it } from 'vitest';

import {
  badgeClassStatutVersion,
  badgeClassTypeScenario,
  badgeClassTypeVersion,
  estPremierDuMois,
  formatDateFr,
  formatMontant,
  formatTaux,
  libelleStatutScenario,
  libelleStatutVersion,
  libelleTauxSource,
  libelleTypeScenario,
  libelleTypeVersion,
  premierDuMoisCourant,
} from './budget';

describe('budget labels', () => {
  it('libelleTypeVersion / badgeClassTypeVersion couvrent les 4 enums', () => {
    expect(libelleTypeVersion('budget_initial')).toBe('Budget initial');
    expect(libelleTypeVersion('reforecast_1')).toBe('Reforecast 1');
    expect(libelleTypeVersion('reforecast_2')).toBe('Reforecast 2');
    expect(libelleTypeVersion('atterrissage')).toBe('Atterrissage');
    expect(badgeClassTypeVersion('budget_initial')).toMatch(/blue/);
    expect(badgeClassTypeVersion('atterrissage')).toMatch(/green/);
    expect(badgeClassTypeVersion('reforecast_2')).toMatch(/violet-700/);
  });

  it('libelleStatutVersion / badgeClassStatutVersion couvrent 4 statuts', () => {
    expect(libelleStatutVersion('ouvert')).toBe('Ouvert');
    expect(libelleStatutVersion('soumis')).toBe('Soumis');
    expect(libelleStatutVersion('valide')).toBe('Validé');
    expect(libelleStatutVersion('gele')).toBe('Gelé');
    expect(badgeClassStatutVersion('ouvert')).toMatch(/green/);
    expect(badgeClassStatutVersion('gele')).toMatch(/gray/);
  });

  it('libelleTypeScenario / badgeClassTypeScenario couvrent les 4 enums', () => {
    expect(libelleTypeScenario('central')).toBe('Central');
    expect(libelleTypeScenario('optimiste')).toBe('Optimiste');
    expect(libelleTypeScenario('pessimiste')).toBe('Pessimiste');
    expect(libelleTypeScenario('alternatif')).toBe('Alternatif');
    expect(badgeClassTypeScenario('optimiste')).toMatch(/emerald/);
    expect(badgeClassTypeScenario('pessimiste')).toMatch(/rose/);
  });

  it('libelleStatutScenario rend actif/archivé', () => {
    expect(libelleStatutScenario('actif')).toBe('Actif');
    expect(libelleStatutScenario('archive')).toBe('Archivé');
  });

  it('formatMontant XOF (0 décimales) avec séparateurs', () => {
    // toLocaleString fr-FR utilise un espace insécable comme séparateur
    expect(formatMontant(1000000)).toMatch(/1.000.000/);
    expect(formatMontant(0)).toBe('0');
  });

  it('formatMontant EUR (2 décimales)', () => {
    const out = formatMontant(1234.5, 'EUR');
    expect(out).toMatch(/1.234,50/);
  });

  it('formatMontant tolère un input string', () => {
    expect(formatMontant('1000', 'XOF')).toMatch(/1.000/);
  });

  it('formatMontant retourne — si valeur non finie', () => {
    expect(formatMontant(NaN)).toBe('—');
    expect(formatMontant('abc')).toBe('—');
  });

  it('formatTaux force 6 décimales', () => {
    expect(formatTaux(655.957)).toMatch(/655,957000/);
    expect(formatTaux(1)).toMatch(/1,000000/);
  });

  it('formatDateFr inverse YYYY-MM-DD en JJ/MM/AAAA', () => {
    expect(formatDateFr('2026-04-01')).toBe('01/04/2026');
    expect(formatDateFr('2026-04-01T10:00:00Z')).toBe('01/04/2026');
    expect(formatDateFr(null)).toBe('—');
    expect(formatDateFr(undefined)).toBe('—');
  });

  it('estPremierDuMois valide uniquement le format YYYY-MM-01', () => {
    expect(estPremierDuMois('2026-04-01')).toBe(true);
    expect(estPremierDuMois('2026-04-15')).toBe(false);
    expect(estPremierDuMois('2026-04-30')).toBe(false);
    expect(estPremierDuMois('20260401')).toBe(false);
  });

  it('premierDuMoisCourant retourne YYYY-MM-01', () => {
    expect(premierDuMoisCourant()).toMatch(/^\d{4}-\d{2}-01$/);
  });

  it('libelleTauxSource couvre les 5 sources', () => {
    expect(libelleTauxSource('fourni-utilisateur')).toMatch(/Fourni/);
    expect(libelleTauxSource('auto-pivot-xof')).toMatch(/pivot/);
    expect(libelleTauxSource('auto-fixe-budgetaire')).toMatch(/fixe/);
    expect(libelleTauxSource('auto-cloture')).toMatch(/clôture/);
    expect(libelleTauxSource('auto-moyen-mensuel')).toMatch(/moyen/);
  });
});
