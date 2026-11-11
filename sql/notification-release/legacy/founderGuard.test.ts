import { it } from 'node:test';
import assert from 'node:assert/strict';
import { isFounderSender, FOUNDER_ID } from './founderGuard';
it('legacy sender: founder with super_admin allowed', () => assert.equal(isFounderSender(FOUNDER_ID, true), true));
it('legacy sender: another super_admin denied', () => assert.equal(isFounderSender('9b1d3a52-0000-4000-8000-000000000099', true), false));
it('legacy sender: founder without role denied', () => assert.equal(isFounderSender(FOUNDER_ID, false), false));
it('legacy sender: missing user denied', () => assert.equal(isFounderSender(undefined, true), false));
