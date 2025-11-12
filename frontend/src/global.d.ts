// src/global.d.ts
import { vi } from 'vitest';

declare global {
  var onendedHandler: () => void;
  var audioInstanceMock: {
    play: vi.fn;
    pause: vi.fn;
    onended: (handler: () => void) => void;
  };
}
