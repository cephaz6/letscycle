import { describe, expect, it, vi } from 'vitest';
import { InProcessEventBus } from './bus.js';
import type { AppEvent } from './schemas.js';

function listingCreatedEvent(): AppEvent<'listing.created'> {
  return {
    eventId: 'e1',
    occurredAt: new Date(),
    eventType: 'listing.created',
    aggregateType: 'listing',
    aggregateId: 'l1',
    payload: {
      listingId: '6e4a2ab6-4bd9-45ee-a319-91a621c8756c',
      sellerId: '0be1b8d1-1275-4a51-a68c-04ba01c1e39e',
    },
  };
}

describe('InProcessEventBus', () => {
  it('delivers events to subscribers of that type only', async () => {
    const bus = new InProcessEventBus(() => {});
    const onListing = vi.fn();
    const onUser = vi.fn();
    bus.subscribe('listing.created', onListing);
    bus.subscribe('user.created', onUser);

    await bus.publish(listingCreatedEvent());

    expect(onListing).toHaveBeenCalledOnce();
    expect(onUser).not.toHaveBeenCalled();
  });

  it('delivers to multiple subscribers', async () => {
    const bus = new InProcessEventBus(() => {});
    const first = vi.fn();
    const second = vi.fn();
    bus.subscribe('listing.created', first);
    bus.subscribe('listing.created', second);

    await bus.publish(listingCreatedEvent());

    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
  });

  it('isolates a failing handler and still runs the rest', async () => {
    const onError = vi.fn();
    const bus = new InProcessEventBus(onError);
    const failing = vi.fn().mockRejectedValue(new Error('handler boom'));
    const healthy = vi.fn();
    bus.subscribe('listing.created', failing);
    bus.subscribe('listing.created', healthy);

    await expect(bus.publish(listingCreatedEvent())).resolves.toBeUndefined();

    expect(healthy).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ eventType: 'listing.created' }),
    );
  });

  it('publishing with no subscribers is a no-op', async () => {
    const bus = new InProcessEventBus(() => {});

    await expect(bus.publish(listingCreatedEvent())).resolves.toBeUndefined();
  });
});
