import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import { vi } from 'vitest';

// LearningSession tests chain several async fetches and framer-motion transitions;
// the 1 s default for findBy/waitFor times out on a loaded machine or CI runner.
configure({ asyncUtilTimeout: 3000 });

// jsdom lacks ResizeObserver; Headless UI anchored menus (floating-ui) need it.
class ResizeObserverStub {
  observe() { }
  unobserve() { }
  disconnect() { }
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub);

// This is a global setup file for tests

// This function will be overwritten by the mock's onended setter,
// allowing tests to trigger it.
globalThis.triggerOnended = () => { };

// Create mock functions that can be asserted in tests
globalThis.playMock = vi.fn(() => Promise.resolve());
globalThis.pauseMock = vi.fn();

// A simple, plain class to mock the Audio constructor
class MockAudio {
  play: () => Promise<void>;
  pause: () => void;

  constructor() {
    // The instance methods are just our global spies
    this.play = globalThis.playMock;
    this.pause = globalThis.pauseMock;
  }

  // When the component code sets audio.onended,
  // we store the provided callback in our global trigger.
  set onended(callback: () => void) {
    globalThis.triggerOnended = callback;
  }
}

// Stub the global Audio object with our mock class
vi.stubGlobal('Audio', MockAudio);

// Reset mocks before each test run
beforeEach(() => {
  globalThis.playMock.mockClear();
  globalThis.pauseMock.mockClear();
  globalThis.triggerOnended = () => { };
});
