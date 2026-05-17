import { describe, it, expect, vi } from 'vitest';
import { vibrate } from './reminder';

describe('vibrate', () => {
  it('returns false when vibrate not supported', async () => {
    const ok = await vibrate();
    expect(ok).toBe(false);
  });

  it('calls navigator.vibrate when available', async () => {
    const vibrateMock = vi.fn();
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrateMock,
      writable: true,
      configurable: true,
    });
    const ok = await vibrate();
    expect(ok).toBe(true);
    expect(vibrateMock).toHaveBeenCalled();
  });
});
