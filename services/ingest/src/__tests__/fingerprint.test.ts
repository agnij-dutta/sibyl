import { describe, it, expect } from 'vitest';
import { fingerprint } from '../lib/fingerprint';

describe('fingerprint', () => {
  it('returns an 8-character string', () => {
    const fp = fingerprint('Something went wrong');
    expect(fp.length).toBeLessThanOrEqual(8);
    expect(fp.length).toBeGreaterThan(0);
  });

  it('produces the same fingerprint for identical messages', () => {
    const fp1 = fingerprint('Connection refused');
    const fp2 = fingerprint('Connection refused');
    expect(fp1).toBe(fp2);
  });

  it('produces different fingerprints for different messages', () => {
    const fp1 = fingerprint('Connection refused');
    const fp2 = fingerprint('Timeout expired');
    expect(fp1).not.toBe(fp2);
  });

  it('normalizes numbers so structurally similar errors match', () => {
    const fp1 = fingerprint('Error at line 42');
    const fp2 = fingerprint('Error at line 99');
    expect(fp1).toBe(fp2);
  });

  it('normalizes UUIDs', () => {
    const fp1 = fingerprint('User 550e8400-e29b-41d4-a716-446655440000 not found');
    const fp2 = fingerprint('User a1b2c3d4-e5f6-7890-abcd-ef1234567890 not found');
    expect(fp1).toBe(fp2);
  });

  it('normalizes hex addresses', () => {
    const fp1 = fingerprint('Segfault at 0x1a2b3c');
    const fp2 = fingerprint('Segfault at 0xdeadbeef');
    expect(fp1).toBe(fp2);
  });

  it('handles empty string', () => {
    const fp = fingerprint('');
    expect(typeof fp).toBe('string');
    expect(fp.length).toBeGreaterThan(0);
  });

  it('includes stack trace in fingerprint when provided', () => {
    const msg = 'Error occurred';
    const stack1 = 'at foo (file.js:10:5)\nat bar (file.js:20:3)';
    const stack2 = 'at baz (other.js:10:5)\nat qux (other.js:20:3)';

    const fp1 = fingerprint(msg, stack1);
    const fp2 = fingerprint(msg, stack2);
    const fpNoStack = fingerprint(msg);

    // Same message with different stacks should differ
    expect(fp1).not.toBe(fp2);
    // With stack vs without stack should differ
    expect(fp1).not.toBe(fpNoStack);
  });

  it('normalizes line/column numbers in stack traces', () => {
    const msg = 'Error';
    const stack1 = 'at foo (file.js:10:5)';
    const stack2 = 'at foo (file.js:99:12)';

    const fp1 = fingerprint(msg, stack1);
    const fp2 = fingerprint(msg, stack2);
    expect(fp1).toBe(fp2);
  });
});
