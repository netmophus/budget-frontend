/**
 * Client API MIZNAS AI Analyse Budget vs Réalisé (Lot 8.6.A).
 * Aligné sur le DTO backend (cf.
 * `src/tableau-de-bord/tableau-bord.controller.ts:analyseAi`).
 *
 * Pattern erreurs : on map les codes HTTP du backend en un type
 * d'erreur discriminé qu'on relance avec un message localisé prêt
 * à afficher. Le caller n'a qu'à attraper `AiAnalyseError` et
 * lire `err.message`.
 */
import { AxiosError } from 'axios';

import { apiClient } from './client';
import type { FiltresEcarts } from './tableau-bord';

export interface AnalyseAiResponse {
  /** Markdown de l'analyse produite par Claude (ou mock si dry-run). */
  analyse: string;
  /** Modèle réellement utilisé (suffixe `-mocked` si dry-run). */
  model: string;
  tokensInput: number;
  tokensOutput: number;
  dureeMs: number;
  /** true si AI_DRY_RUN=true côté backend → afficher le badge dans l'UI. */
  dryRun: boolean;
}

export type AnalyseAiPayload = FiltresEcarts;

export type AiAnalyseErrorCode =
  | 'RATE_LIMIT'
  | 'DATA_ERROR'
  | 'PROVIDER_ERROR'
  | 'UNKNOWN';

export class AiAnalyseError extends Error {
  public readonly code: AiAnalyseErrorCode;
  public readonly retryAfterSeconds?: number;

  constructor(
    code: AiAnalyseErrorCode,
    message: string,
    retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'AiAnalyseError';
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/**
 * Déclenche une analyse MIZNAS AI sur le périmètre demandé. Retourne
 * la réponse markdown + métadonnées (modèle, tokens, durée). Rejette
 * un `AiAnalyseError` avec un code discriminé selon le statut HTTP
 * du backend (429 / 500 / 502 / autre).
 */
export async function demanderAnalyseAi(
  payload: AnalyseAiPayload,
): Promise<AnalyseAiResponse> {
  try {
    const { data } = await apiClient.post<AnalyseAiResponse>(
      '/tableau-de-bord/analyse-ai',
      payload,
    );
    return data;
  } catch (err) {
    if (err instanceof AxiosError) {
      const status = err.response?.status;
      const body = err.response?.data as
        | { message?: string; retryAfterSeconds?: number }
        | undefined;
      if (status === 429) {
        throw new AiAnalyseError(
          'RATE_LIMIT',
          body?.message ??
            "Quota d'analyses atteint. Réessayez plus tard.",
          body?.retryAfterSeconds,
        );
      }
      if (status === 500) {
        throw new AiAnalyseError(
          'DATA_ERROR',
          body?.message ??
            "Erreur lors de la récupération des données. Lancez d'abord une analyse classique.",
        );
      }
      if (status === 502) {
        throw new AiAnalyseError(
          'PROVIDER_ERROR',
          body?.message ??
            'MIZNAS AI temporairement indisponible. Réessayez dans quelques minutes.',
        );
      }
    }
    const fallback = err instanceof Error ? err.message : 'Erreur inconnue';
    throw new AiAnalyseError(
      'UNKNOWN',
      `Échec de l'analyse MIZNAS AI : ${fallback}`,
    );
  }
}
