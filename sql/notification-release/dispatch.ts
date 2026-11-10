import type { Channel } from './policy.ts';
export type ChannelResult = { ok: boolean; selected: number; subscribers?: number; subscriptions?: number; accepted?: number; errors?: number; invalid?: number; error?: string; telegram?: unknown; reused?: boolean };
export async function dispatchChannels(channels: Channel[], deps: {
  claim: (channel: Channel) => Promise<boolean>;
  previous: (channel: Channel) => Promise<ChannelResult | null>;
  deliver: (channel: Channel) => Promise<ChannelResult>;
  save: (channel: Channel, result: ChannelResult) => Promise<void>;
}): Promise<Partial<Record<Channel, ChannelResult>>> {
  const results: Partial<Record<Channel, ChannelResult>> = {};
  for (const channel of channels) {
    if (!await deps.claim(channel)) {
      const previous = await deps.previous(channel);
      results[channel] = previous ? { ...previous, reused: true } : { ok: false, selected: 0, error: 'in_progress_or_uncertain', reused: true };
      continue;
    }
    let result: ChannelResult;
    try { result = await deps.deliver(channel); }
    catch { result = { ok: false, selected: 0, error: 'delivery_failed_or_uncertain' }; }
    // A persistence failure leaves the claim intact. Never automatically re-deliver uncertain sends.
    await deps.save(channel, result);
    results[channel] = result;
  }
  return results;
}