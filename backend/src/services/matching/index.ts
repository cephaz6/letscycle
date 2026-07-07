// Extractable module — event-only integration. No other feature module imports
// matching or calls it directly; they publish events that its handlers react
// to. The only exports are:
//   - registerMatchingHandlers: infrastructure wiring (subscribe to the bus)
//   - expressInterest: this module's own buyer-facing endpoint
export { registerMatchingHandlers } from './handlers.js';
export { expressInterest } from './matching.service.js';
