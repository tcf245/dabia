// src/global.d.ts
import type { vi } from 'vitest';

declare global {
  var triggerOnended: () => void;
  var playMock: vi.Mock;
  var pauseMock: vi.Mock;
}
