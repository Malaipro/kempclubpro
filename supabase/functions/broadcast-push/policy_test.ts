import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { eligible, notification, deliver, allowedEndpoint, TEST_USER_ID } from './policy.ts';
const resident = { user_id: 'r', approved: true, participant_status: 'club_resident', current_stream_id: null };
Deno.test('resident audience excludes intensive and unapproved', () => {
  assertEquals(eligible(resident, 'resident', null, null), true);
  assertEquals(eligible({ ...resident, participant_status: 'intensive_active' }, 'resident', null, null), false);
  assertEquals(eligible({ ...resident, approved: false }, 'all', null, null), false);
});
Deno.test('intensive and alumni match existing broadcast statuses', () => {
  assertEquals(eligible({ ...resident, participant_status: 'intensive_active' }, 'intensive', null, null), true);
  assertEquals(eligible({ ...resident, participant_status: 'alumni' }, 'alumni', null, null), true);
  assertEquals(eligible({ ...resident, participant_status: 'intensive_completed' }, 'all', null, null), false);
});
Deno.test('explicit list restricts recipients and empty list sends to nobody', () => {
  assertEquals(eligible(resident, 'all', ['other'], null), false);
  assertEquals(eligible(resident, 'all', [], null), false);
  assertEquals(eligible(resident, 'intensive', ['r'], null), true);
});
Deno.test('club event only reaches residents and intensive event stays in its stream', () => {
  const club = { is_active: true, schedule_type: 'club', stream_id: null };
  assertEquals(eligible(resident, 'all', null, club), true);
  assertEquals(eligible({ ...resident, participant_status: 'alumni' }, 'all', null, club), false);
  const intensive = { ...resident, participant_status: 'intensive_active', current_stream_id: '8' };
  assertEquals(eligible(intensive, 'all', null, { is_active: true, schedule_type: 'intensive', stream_id: '7' }), false);
  assertEquals(eligible(intensive, 'all', null, { is_active: true, schedule_type: 'intensive', stream_id: '8' }), true);
});
Deno.test('event link uses implemented app section; no buttons go home', () => {
  assertEquals(notification('text', [{ type: 'book_event', target_id: 'event' }]).url, '/app?section=schedule&event=event');
  assertEquals(notification('text', []).url, '/app');
  assertEquals(notification('text', [{ type: 'url', url: 'https://kempclub.pro' }]).url, 'https://kempclub.pro');
});
Deno.test('test recipient is fixed Dmitriy 116 account', () => assertEquals(TEST_USER_ID, '9b972710-84a4-4e95-894d-2eee1ce8360b'));
Deno.test('subscription endpoints cannot target internal services', () => {
  assertEquals(allowedEndpoint('https://127.0.0.1/test'), false);
  assertEquals(allowedEndpoint('http://fcm.googleapis.com/push'), false);
  assertEquals(allowedEndpoint('https://fcm.googleapis.com/push'), true);
});
Deno.test('404/410 are removed; user count deduplicates devices; other errors retain subscription', async () => {
  const subscriptions = ['ok', 'gone', 'missing', 'failed'].map((id, index) => ({ id, user_id: index < 2 ? 'r' : id, endpoint: 'https://fcm.googleapis.com/push', p256dh: '', auth: '' }));
  const removed: string[] = [];
  const result = await deliver(subscriptions, {}, async sub => {
    if (sub.id !== 'ok') throw { statusCode: sub.id === 'gone' ? 410 : sub.id === 'missing' ? 404 : 500 };
  }, async id => { removed.push(id); });
  assertEquals(removed, ['gone', 'missing']);
  assertEquals(result, { sent: 1, subscribed: 3, failed: 2, expired: 2 });
});