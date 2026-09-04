import assert from 'node:assert/strict';
import test from 'node:test';
import {
  nextPostureIndex,
  pickMessage,
  POSTURE_REMINDERS,
  shouldResetAfterSuspension,
  SUSPEND_GAP_MS,
} from './reminders';

test('postures rotate stand, sit, walk and back to stand', () => {
  assert.equal(nextPostureIndex(0), 1);
  assert.equal(nextPostureIndex(1), 2);
  assert.equal(nextPostureIndex(2), 0);
});

test('message selection stays inside the active posture', () => {
  assert.equal(pickMessage(POSTURE_REMINDERS[0], () => 0), POSTURE_REMINDERS[0].messages[0]);
  assert.equal(pickMessage(POSTURE_REMINDERS[0], () => 0.999), POSTURE_REMINDERS[0].messages.at(-1));
});

test('a long timer gap is treated as sleep or suspension', () => {
  assert.equal(shouldResetAfterSuspension(1_000, 1_000 + SUSPEND_GAP_MS), false);
  assert.equal(shouldResetAfterSuspension(1_000, 1_001 + SUSPEND_GAP_MS), true);
});
