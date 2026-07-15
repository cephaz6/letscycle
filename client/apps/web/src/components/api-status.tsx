'use client';

import { useHealth } from '@letscycle/api-client';
import { Icon, Text } from '@letscycle/ui';

/** Live probe of the backend — exercises the api-client + Query provider. */
export function ApiStatus() {
  const { data, isLoading, isError } = useHealth();

  if (isLoading) {
    return (
      <Text muted className="flex items-center gap-2 text-sm">
        <Icon name="Loader" className="size-4 animate-spin" /> Checking API…
      </Text>
    );
  }

  if (isError || data?.status !== 'ok') {
    return (
      <Text className="flex items-center gap-2 text-sm text-destructive">
        <Icon name="CircleX" className="size-4" /> API unreachable
      </Text>
    );
  }

  return (
    <Text className="flex items-center gap-2 text-sm text-success">
      <Icon name="CircleCheck" className="size-4" /> API healthy
      {data.db ? ` · db ${data.db}` : ''}
    </Text>
  );
}
