// In-app delivery is the persisted notification row itself (surfaced through
// GET /notifications). There is nothing else to send — this marks the channel
// delivered for symmetry with the other dispatchers.
export function deliverInApp(): boolean {
  return true;
}
