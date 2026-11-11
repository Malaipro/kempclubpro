import { it } from 'node:test';
import assert from 'node:assert/strict';
import { safeAppLink } from './appLinks';
it('notification opens existing schedule section', () => assert.equal(safeAppLink('/app?section=schedule'), '/app?section=schedule'));
it('rejects external and unimplemented event links', () => {
  assert.throws(() => safeAppLink('https://evil.example/app'));
  assert.throws(() => safeAppLink('/app?event=123'));
  assert.throws(() => safeAppLink('/app?section=unknown'));
});
import { safeAppReturnLink, eventIdFromAppLink } from './appLinks';
const EV = '6f1c2b3a-1111-4222-8333-944445555666';
it('event deep link opens schedule card', () => {
  const link = safeAppReturnLink(`https://kemp-app.ru/app?section=schedule&event=${EV}`);
  assert.equal(link, `/app?section=schedule&event=${EV}`);
  assert.equal(eventIdFromAppLink(link), EV);
});
it('event link requires schedule section and uuid', () => {
  assert.throws(() => safeAppReturnLink(`/app?section=chat&event=${EV}`));
  assert.throws(() => safeAppReturnLink('/app?section=schedule&event=abc'));
  assert.throws(() => safeAppReturnLink(`https://evil.example/app?section=schedule&event=${EV}`));
  assert.throws(() => safeAppReturnLink(`/app?section=schedule&event=${EV}&next=x`));
});
it('push links remain section-only', () => assert.throws(() => safeAppLink(`/app?section=schedule&event=${EV}`)));
it('return link keeps plain sections', () => assert.equal(safeAppReturnLink('/app?section=chat'), '/app?section=chat'));
