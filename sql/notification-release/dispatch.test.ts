import { it } from 'node:test';
import assert from 'node:assert/strict';
import { dispatchChannels, type ChannelResult } from './dispatch';
import type { Channel } from './policy';
function harness() {
  const claimed = new Set<Channel>(); const saved = new Map<Channel, ChannelResult>(); const deliveries: Channel[] = [];
  return { deliveries, deps: {
    claim: async (c: Channel) => { if(claimed.has(c)) return false; claimed.add(c); return true; },
    previous: async (c: Channel) => saved.get(c) ?? null,
    deliver: async (c: Channel) => { deliveries.push(c); return {ok:true,selected:1,accepted:1}; },
    save: async (c: Channel,r: ChannelResult) => {saved.set(c,r);},
  }};
}
it('push only never triggers Telegram', async () => {const h=harness(); await dispatchChannels(['push'],h.deps); assert.deepEqual(h.deliveries,['push']);});
it('group and push both deliver independently', async () => {const h=harness(); await dispatchChannels(['telegram_group','push'],h.deps); assert.deepEqual(h.deliveries,['telegram_group','push']);});
it('personal Telegram and push both deliver independently', async () => {const h=harness(); await dispatchChannels(['telegram_personal','push'],h.deps); assert.deepEqual(h.deliveries,['telegram_personal','push']);});
it('repeated and parallel requests never redeliver claimed channel', async () => {const h=harness(); await Promise.all([dispatchChannels(['push'],h.deps),dispatchChannels(['push'],h.deps)]); const r=await dispatchChannels(['push'],h.deps); assert.deepEqual(h.deliveries,['push']); assert.equal(r.push?.reused,true);});
it('failed Telegram does not prevent push', async () => {const h=harness(); const deliver=h.deps.deliver; h.deps.deliver=async c=>{if(c==='telegram_group')throw new Error('timeout');return deliver(c);};const r=await dispatchChannels(['telegram_group','push'],h.deps); assert.equal(r.telegram_group?.ok,false); assert.equal(r.push?.ok,true);});