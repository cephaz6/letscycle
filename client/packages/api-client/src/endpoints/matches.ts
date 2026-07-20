import { http } from '../http';

export interface MatchInterestResult {
  candidateId: string;
  status: 'interested';
}

export const matchesApi = {
  /**
   * Express interest in a match candidate (surfaced to the user as a
   * "matchFound" notification carrying the candidate id). Idempotent.
   */
  expressInterest(candidateId: string): Promise<MatchInterestResult> {
    return http.post<MatchInterestResult>(`/matches/${candidateId}/interest`);
  },
};
