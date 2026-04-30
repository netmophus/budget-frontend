import {
  Activity,
  Building2,
  Calendar,
  ClipboardCheck,
  Coins,
  Flag,
  GitBranch,
  Globe,
  Hash,
  type LucideIcon,
  Package,
  Scale,
  Tag,
  Target,
} from 'lucide-react';

import type { RefKey } from '@/lib/api/configuration';

export type RefCategorie =
  | 'organisation'
  | 'plan-comptable'
  | 'metier'
  | 'workflow'
  | 'systeme';

export interface RefCategorieMeta {
  key: RefCategorie;
  label: string;
}

export const REF_CATEGORIES: RefCategorieMeta[] = [
  { key: 'organisation', label: 'Organisation' },
  { key: 'plan-comptable', label: 'Plan comptable' },
  { key: 'metier', label: 'Métier' },
  { key: 'workflow', label: 'Workflow budget' },
  { key: 'systeme', label: 'Système' },
];

export interface RefSecondaireMeta {
  refKey: RefKey;
  label: string;
  labelSingular: string;
  icon: LucideIcon;
  categorie: RefCategorie;
  description: string;
  /**
   * Validations spécifiques côté UI. La validation forte est portée
   * par la FK + le DTO backend ; ce sont juste des messages d'erreur
   * utilisateur plus parlants.
   */
  codePattern?: RegExp;
  codeHint?: string;
  /** Force le code en majuscules en saisie (ex. ref_pays). */
  forceUppercase?: boolean;
  /** Mode de saisie suggéré (numeric pour ref_classe_compte). */
  inputMode?: 'numeric';
}

const REF_META: Record<RefKey, RefSecondaireMeta> = {
  // ─── Organisation
  'type-structure': {
    refKey: 'type-structure',
    label: 'Types de structure',
    labelSingular: 'type de structure',
    icon: Building2,
    categorie: 'organisation',
    description:
      "Hiérarchie organisationnelle de l'établissement (entité juridique → branche → direction → département → agence).",
  },
  pays: {
    refKey: 'pays',
    label: 'Pays UEMOA',
    labelSingular: 'pays',
    icon: Globe,
    categorie: 'organisation',
    description:
      'Codes ISO 3 lettres des pays UEMOA + un code de repli pour les structures hors UEMOA.',
    codePattern: /^[A-Z]{3}$/,
    codeHint: '3 lettres majuscules (ex. CIV, BFA, SEN).',
    forceUppercase: true,
  },
  'type-cr': {
    refKey: 'type-cr',
    label: 'Types de centre de responsabilité',
    labelSingular: 'type de CR',
    icon: Target,
    categorie: 'organisation',
    description:
      'Typologie des CR : centre de coût, centre de profit, centre de revenu, autre.',
  },

  // ─── Plan comptable
  'sens-compte': {
    refKey: 'sens-compte',
    label: 'Sens des comptes',
    labelSingular: 'sens',
    icon: Scale,
    categorie: 'plan-comptable',
    description:
      'Sens normal du compte : Débit (charges/actifs), Crédit (produits/passifs), Mixte.',
    codePattern: /^[DCM]$/,
    codeHint: '1 caractère : D, C ou M.',
    forceUppercase: true,
  },
  'classe-compte': {
    refKey: 'classe-compte',
    label: 'Classes du PCB',
    labelSingular: 'classe PCB',
    icon: Hash,
    categorie: 'plan-comptable',
    description:
      'Classes du PCB UMOA Révisé (1 à 9). Toutes système — pilotées par le référentiel BCEAO.',
    codePattern: /^[1-9]$/,
    codeHint: 'Chiffre 1 à 9.',
    inputMode: 'numeric',
  },

  // ─── Métier
  'type-produit': {
    refKey: 'type-produit',
    label: 'Types de produit',
    labelSingular: 'type de produit',
    icon: Package,
    categorie: 'metier',
    description:
      'Typologie des produits bancaires : crédit, dépôt, service, marché, autre.',
  },
  'categorie-segment': {
    refKey: 'categorie-segment',
    label: 'Catégories de segment',
    labelSingular: 'catégorie',
    icon: Tag,
    categorie: 'metier',
    description:
      'Segmentation clientèle : particulier, professionnel, PME, grande entreprise, institutionnel, secteur public.',
  },

  // ─── Workflow budget
  'type-version': {
    refKey: 'type-version',
    label: 'Types de version',
    labelSingular: 'type de version',
    icon: GitBranch,
    categorie: 'workflow',
    description:
      'Phases du cycle budgétaire : budget initial, reforecast 1, reforecast 2, atterrissage.',
  },
  'statut-version': {
    refKey: 'statut-version',
    label: 'Statuts de version',
    labelSingular: 'statut de version',
    icon: ClipboardCheck,
    categorie: 'workflow',
    description:
      'États du workflow d\'une version : ouvert, soumis, validé, gelé.',
  },
  'type-scenario': {
    refKey: 'type-scenario',
    label: 'Types de scénario',
    labelSingular: 'type de scénario',
    icon: GitBranch,
    categorie: 'workflow',
    description:
      'Hypothèses macro : central, optimiste, pessimiste, alternatif.',
  },
  'statut-scenario': {
    refKey: 'statut-scenario',
    label: 'Statuts de scénario',
    labelSingular: 'statut de scénario',
    icon: ClipboardCheck,
    categorie: 'workflow',
    description: 'États d\'un scénario : actif, archivé.',
  },

  // ─── Système
  'type-taux': {
    refKey: 'type-taux',
    label: 'Types de taux de change',
    labelSingular: 'type de taux',
    icon: Coins,
    categorie: 'systeme',
    description:
      "Types de taux BCEAO retenus : clôture, moyen mensuel, fixe budgétaire.",
  },
  'type-action-audit': {
    refKey: 'type-action-audit',
    label: "Types d'action audit",
    labelSingular: "type d'action",
    icon: Activity,
    categorie: 'systeme',
    description:
      "Actions tracées dans le journal d'audit (CREATE / UPDATE / DELETE / LOGIN / etc.).",
  },
};

export function refMeta(refKey: RefKey): RefSecondaireMeta {
  return REF_META[refKey];
}

export const REF_KEYS_ORDERED: RefKey[] = [
  'type-structure',
  'pays',
  'type-cr',
  'sens-compte',
  'classe-compte',
  'type-produit',
  'categorie-segment',
  'type-version',
  'statut-version',
  'type-scenario',
  'statut-scenario',
  'type-taux',
  'type-action-audit',
];

export function refsByCategory(): Record<RefCategorie, RefSecondaireMeta[]> {
  const grouped: Record<RefCategorie, RefSecondaireMeta[]> = {
    organisation: [],
    'plan-comptable': [],
    metier: [],
    workflow: [],
    systeme: [],
  };
  for (const key of REF_KEYS_ORDERED) {
    grouped[REF_META[key].categorie].push(REF_META[key]);
  }
  return grouped;
}

/**
 * Icône Lucide pour la catégorie en tête de section sidebar.
 */
export function categorieIcon(cat: RefCategorie): LucideIcon {
  switch (cat) {
    case 'organisation':
      return Building2;
    case 'plan-comptable':
      return Hash;
    case 'metier':
      return Tag;
    case 'workflow':
      return Calendar;
    case 'systeme':
      return Flag;
  }
}
