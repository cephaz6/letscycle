import type { PushSender } from './push.types.js';

// In-memory Web Push stand-in for dev and tests: records nothing, always
// "delivers". Real web-push replaces this behind the PushSender interface.
export function createDummyPushSender(): PushSender {
  return {
    send() {
      return Promise.resolve(true);
    },
  };
}
