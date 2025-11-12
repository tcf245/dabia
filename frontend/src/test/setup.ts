import '@testing-library/jest-dom';
import { vi } from 'vitest';

// This is a global setup file for tests

// This function will be overwritten by the mock's onended setter,
// allowing tests to trigger it.
global.triggerOnended = () => {};

// Create mock functions that can be asserted in tests
global.playMock = vi.fn(() => Promise.resolve());
global.pauseMock = vi.fn();

// A simple, plain class to mock the Audio constructor
class MockAudio {
  play: () => Promise<void>;
  pause: () => void;

  constructor(url: string | URL) {
    // The instance methods are just our global spies
    this.play = global.playMock;
    this.pause = global.pauseMock;
  }

  // When the component code sets audio.onended,
  // we store the provided callback in our global trigger.
  set onended(callback: () => void) {
    global.triggerOnended = callback;
  }
}

// Stub the global Audio object with our mock class
vi.stubGlobal('Audio', MockAudio);

// Reset mocks before each test run
beforeEach(() => {
  global.playMock.mockClear();
  global.pauseMock.mockClear();
  global.triggerOnended = () => {};
});
