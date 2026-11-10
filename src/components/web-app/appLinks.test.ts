import { it } from 'node:test';
import assert from 'node:assert/strict';
import { safeAppLink } from './appLinks';
it('notification opens existing schedule section', () => assert.equal(safeAppLink('/app?section=schedule'), '/app?section=schedule'));
it('rejects external and unimplemented event links', () => {
  assert.throws(() => safeAppLink('https://evil.example/app'));
  assert.throws(() => safeAppLink('/app?event=123'));
  assert.throws(() => safeAppLink('/app?section=unknown'));
});