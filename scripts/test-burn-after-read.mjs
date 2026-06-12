import assert from 'node:assert/strict';
import {
  BURN_AFTER_READ_SECONDS,
  getBurnTimeLeftSeconds,
  isBurnExpired,
  isBurnUnread,
} from '../src/utils/burnAfterRead.js';

const now = new Date('2026-06-12T12:00:00.000Z');
const expiresAt = new Date('2026-06-12T12:02:00.000Z');

assert.equal(BURN_AFTER_READ_SECONDS, 120);
assert.equal(getBurnTimeLeftSeconds(expiresAt, now), 120);
assert.equal(getBurnTimeLeftSeconds(expiresAt, new Date('2026-06-12T12:01:30.000Z')), 30);
assert.equal(getBurnTimeLeftSeconds(expiresAt, new Date('2026-06-12T12:03:00.000Z')), 0);
assert.equal(isBurnExpired(expiresAt, new Date('2026-06-12T12:02:01.000Z')), true);
assert.equal(isBurnExpired(expiresAt, now), false);
assert.equal(isBurnUnread({ burnAfterRead: true, burnOpenedAt: null }), true);
assert.equal(isBurnUnread({ burnAfterRead: true, burnOpenedAt: now }), false);
assert.equal(isBurnUnread({ burnAfterRead: false, burnOpenedAt: null }), false);

console.log('burn-after-read helpers passed');
