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
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
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
