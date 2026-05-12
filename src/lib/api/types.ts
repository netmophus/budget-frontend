export interface AuthUser {
  id: string;
  email: string;
  nom: string;
  prenom: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUser;
  // Lot 6.4.A — flags d'état mot de passe. Si l'un des 2 est vrai,
  // le frontend doit rediriger vers /change-mdp avant tout accès.
  mdpExpire: boolean;
  doitChangerMdp: boolean;
  // Lot 6.7.1 — bandeau d'avertissement J-7. Mutuellement exclusif
  // avec mdpExpire (vrai uniquement si dateExpirationMdp ∈ ]now, now+7j[).
  mdpExpireProchainement: boolean;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/** Lot 6.4.C — réponse PATCH /me/password : nouveaux tokens sans flags. */
export interface ChangerMdpResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUser;
  mdpExpire: false;
  doitChangerMdp: false;
  // Lot 6.7.1 — toujours false après changement (date d'expiration
  // renouvelée à mdpDureeValiditeJours, soit ~90j par défaut).
  mdpExpireProchainement: false;
}

/** Lot 6.4.C — réponse refactorée POST /admin/users/:id/reset-password. */
export interface ResetPasswordAdminResponse {
  success: boolean;
  message: string;
}

/**
 * Lot 6.5.A — réponse uniforme POST /auth/forgot-password.
 * Identique pour email connu/inconnu (anti-énumération).
 */
export interface ForgotPasswordResponse {
  success: true;
  message: string;
}

/**
 * Lot 6.5.A — réponse POST /auth/reset-password.
 * Le user devra se reconnecter normalement après (pas de tokens
 * JWT auto-émis).
 */
export interface ResetPasswordResponse {
  success: true;
  message: string;
}

export interface UserRoleSummary {
  code: string;
  libelle: string;
  perimetreType: string | null;
  perimetreId: string | null;
}

export interface EffectivePermission {
  code_permission: string;
  module: string;
  perimetre_type: 'global' | 'structure' | 'centre_responsabilite';
  perimetre_id: string | null;
}

export interface CurrentUserView {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  roles: UserRoleSummary[];
  permissions: string[];
}

export interface UserResponse {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  estActif: boolean;
  dateDerniereConnexion: string | null;
  dateCreation: string;
  /**
   * Lot 4.1-fix.A — rempli uniquement si listUsers est appelé avec
   * `{ withPerimetresCount: true }`. Compte les lignes
   * user_perimetres actives couvrant aujourd'hui.
   */
  nombrePerimetresActifs?: number;
}

export interface UserDetailResponse extends UserResponse {
  roles: UserRoleSummary[];
  permissions: EffectivePermission[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface PermissionResponse {
  id: string;
  codePermission: string;
  libelle: string;
  module: string;
  description: string | null;
}

export interface RoleResponse {
  id: string;
  codeRole: string;
  libelle: string;
  description: string | null;
  estActif: boolean;
  permissions: PermissionResponse[];
}

export type AuditTypeAction =
  | 'LOGIN'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'REFRESH'
  | 'REFRESH_FORCED_REVOCATION'
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'VALIDATE'
  | 'FREEZE'
  | 'EXPORT'
  | 'IMPORT'
  | 'PERMISSION_DENIED'
  | 'LIRE_AUDIT';

export type AuditStatut = 'success' | 'failure';

export interface AuditLogResponse {
  id: string;
  dateAction: string;
  utilisateur: string;
  ipSource: string | null;
  userAgent: string | null;
  typeAction: AuditTypeAction;
  entiteCible: string;
  idCible: string | null;
  payloadAvant: unknown;
  payloadApres: unknown;
  commentaire: string | null;
  statut: AuditStatut;
  dureeMs: number | null;
}

export interface ApiError {
  statusCode: number;
  message: string;
  errorCode: string;
  timestamp: string;
  path: string;
}
