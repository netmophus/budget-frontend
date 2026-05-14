/**
 * Constantes de marque banque cliente (Lot 7.3).
 *
 * Pour le Lot 7.3, valeurs en dur (BSIC). Une banque cliente = un
 * build dédié avec son `.env.production`.
 *
 * TODO Lot 7.5 — paramétrage multi-banques : remplacer par lecture
 * depuis `import.meta.env` :
 *   VITE_BANK_NAME
 *   VITE_BANK_SIGLE
 *   VITE_BANK_YEAR
 *
 * Architecture retenue : variables d'environnement au build (Vite
 * remplace `import.meta.env.VITE_*` à la compilation, donc pas
 * d'exposition côté runtime — aligné avec la sécurité demandée pour
 * une banque pilote).
 */

/** Nom légal complet de la banque cliente (footer + zone identité). */
export const BANK_NAME =
  "Banque sahélo-saharienne pour l'investissement et le commerce";

/** Sigle court de la banque (badges, mentions footer). */
export const BANK_SIGLE = 'BSIC';

/** Année légale affichée dans le footer des pages publiques. */
export const BANK_YEAR = '2026';

/**
 * Nom commercial du module applicatif MIZNAS — utilisé dans la balise
 * <title>, la meta description et la zone identité publique.
 */
export const APP_NAME = 'MIZNAS Pilotage Budgétaire';

/**
 * Slogan du module, affiché sur 2 lignes dans la zone identité
 * publique (maquette validée Lot 7.3 V4). Deux constantes séparées
 * pour que le rendu typographique reste maîtrisé (un `<br />` entre
 * les 2 lignes, pas un retour à la ligne automatique).
 */
export const APP_TAGLINE_LINE_1 = 'Maîtrisez vos budgets,';
export const APP_TAGLINE_LINE_2 = 'pilotez la performance bancaire.';

/**
 * Version applicative MIZNAS affichée dans le footer des pages
 * publiques.
 *
 * Volontairement en constante manuelle plutôt qu'import du
 * `package.json` : le tsconfig.app.json n'active pas
 * `resolveJsonModule` et `verbatimModuleSyntax: true` rend
 * l'import strict. Synchronisation manuelle assumée jusqu'au tag
 * release (cf. doc release v1.0.0-mvp §7).
 */
export const APP_VERSION = '0.1';
