/** Centralised query keys so features invalidate consistently. */
export const queryKeys = {
  system: {
    health: ['system', 'health'] as const,
    publicSettings: ['system', 'publicSettings'] as const,
    currentTerms: ['system', 'currentTerms'] as const,
  },
};
