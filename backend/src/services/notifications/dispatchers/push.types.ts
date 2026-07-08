export interface PushMessage {
  title: string;
  body: string;
  data: Record<string, unknown>;
}

export interface PushTarget {
  endpoint: string;
  keys: Record<string, string>;
}

// Seam for the Web Push Protocol. The dummy serves dev and tests; the real
// implementation (`web-push` + VAPID keys from Secrets Manager) plugs in
// unchanged with the CDK infrastructure. A 410/404 from a real push service
// means the subscription is gone and should be revoked — modelled as `false`.
export interface PushSender {
  send(target: PushTarget, message: PushMessage): Promise<boolean>;
}
