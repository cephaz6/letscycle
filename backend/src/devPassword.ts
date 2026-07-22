/**
 * Dev-only: set the email/password login for an existing account.
 *
 *   docker compose exec backend node dist/devPassword.js <email> <password>
 *
 * Writes (or replaces) the account's dummy credential, reusing its existing
 * cognitoSub so the login resolves to the same user row. Useful when an account
 * predates the credential store. Refuses to run in production — real Cognito
 * owns passwords there.
 */
import { getEnv } from './shared/config/env.js';
import { getDb, disconnectDb } from './shared/db/client.js';
import { createDevCredentialStore, hashDevPassword } from './services/auth/index.js';

async function main(): Promise<void> {
  const env = getEnv();
  if (env.NODE_ENV === 'production') {
    throw new Error('devPassword is a development tool and cannot run in production');
  }

  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    throw new Error('Usage: node dist/devPassword.js <email> <password>');
  }

  const user = await getDb().user.findUnique({
    where: { email },
    select: { id: true, cognitoSub: true, accountStatus: true },
  });
  if (!user) {
    throw new Error(`No account found for ${email}`);
  }
  if (user.accountStatus !== 'active') {
    throw new Error(`Account ${email} is ${user.accountStatus}`);
  }

  await createDevCredentialStore(getDb()).upsert(email, {
    passwordHash: hashDevPassword(
      env.AUTH_DEV_TOKEN_SECRET ?? 'letscycle-local-dev-secret',
      password,
    ),
    cognitoSub: user.cognitoSub,
  });
  console.log(`Password set for ${email}. Sign in with it now.`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => void disconnectDb());
