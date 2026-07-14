export {
  submitReview,
  raiseFlag,
  getUserTrustScore,
  listUserReviews,
} from './trust.service.js';
export { registerTrustHandlers } from './handlers.js';
export type {
  SubmitReviewInput,
  ReviewView,
  RaiseFlagInput,
  FlagView,
  TrustScoreView,
  FlagTargetType,
} from './trust.types.js';
