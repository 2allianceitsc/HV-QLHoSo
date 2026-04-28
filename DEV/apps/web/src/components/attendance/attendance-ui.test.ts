import { calcCooldownRemaining, formatStatusMaxDuration } from './attendance-ui';

describe('calcCooldownRemaining', () => {
  const INTERVAL = 3;

  it('returns minInterval at t=0 (no elapsed time)', () => {
    const now = 1000;
    expect(calcCooldownRemaining(now, now, INTERVAL)).toBe(3);
  });

  it('returns minInterval when server clock is 1 ms ahead of client (the reported "4s" bug)', () => {
    // Server recorded startTime 1 ms in the future relative to client's Date.now()
    const startMs = 1001;
    const nowMs = 1000; // client is 1 ms behind
    // Without the cap: Math.ceil(3 - (-0.001)) = Math.ceil(3.001) = 4
    expect(calcCooldownRemaining(startMs, nowMs, INTERVAL)).toBe(3);
  });

  it('caps at minInterval even with larger clock skew (500 ms ahead)', () => {
    const startMs = 1500;
    const nowMs = 1000; // client is 500 ms behind
    expect(calcCooldownRemaining(startMs, nowMs, INTERVAL)).toBe(3);
  });

  it('counts down correctly at 1 s elapsed', () => {
    const startMs = 0;
    const nowMs = 1000; // 1 s elapsed → remaining = 2
    expect(calcCooldownRemaining(startMs, nowMs, INTERVAL)).toBe(2);
  });

  it('counts down correctly at 1.5 s elapsed (ceiling)', () => {
    const startMs = 0;
    const nowMs = 1500; // 1.5 s elapsed → remaining = 1.5 → ceil = 2
    expect(calcCooldownRemaining(startMs, nowMs, INTERVAL)).toBe(2);
  });

  it('counts down correctly at 2.9 s elapsed (ceiling)', () => {
    const startMs = 0;
    const nowMs = 2900; // remaining = 0.1 → ceil = 1
    expect(calcCooldownRemaining(startMs, nowMs, INTERVAL)).toBe(1);
  });

  it('returns 0 when exactly at minInterval boundary', () => {
    const startMs = 0;
    const nowMs = 3000; // remaining = 0 → ceil = 0
    expect(calcCooldownRemaining(startMs, nowMs, INTERVAL)).toBe(0);
  });

  it('returns 0 when elapsed exceeds minInterval (already expired)', () => {
    const startMs = 0;
    const nowMs = 5000; // 5 s > 3 s
    expect(calcCooldownRemaining(startMs, nowMs, INTERVAL)).toBe(0);
  });

  it('works correctly with a custom minInterval of 5', () => {
    const startMs = 0;
    const nowMs = 2000; // remaining = 3 → ceil = 3
    expect(calcCooldownRemaining(startMs, nowMs, 5)).toBe(3);
  });
});

describe('formatStatusMaxDuration', () => {
  it('returns null for falsy input', () => {
    expect(formatStatusMaxDuration(null)).toBeNull();
    expect(formatStatusMaxDuration(undefined)).toBeNull();
    expect(formatStatusMaxDuration(0)).toBeNull();
  });

  it('formats seconds only', () => {
    expect(formatStatusMaxDuration(45)).toBe('45s');
  });

  it('formats minutes and seconds', () => {
    expect(formatStatusMaxDuration(90)).toBe('1m 30s');
  });

  it('formats hours and minutes (no seconds)', () => {
    expect(formatStatusMaxDuration(3600)).toBe('1h');
    expect(formatStatusMaxDuration(5400)).toBe('1h 30m');
  });

  it('formats hours, minutes, and seconds', () => {
    expect(formatStatusMaxDuration(3661)).toBe('1h 1m 1s');
  });
});
