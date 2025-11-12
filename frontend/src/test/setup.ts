import '@testing-library/jest-dom';
import { vi } from 'vitest';

// This is a global setup file for tests

// 1. Mock the global Audio object
// We attach the mock and its controls to the global object
// so that our test files can access them.

// This function will be overwritten by the component's onended assignment
global.onendedHandler = () => {};

global.audioInstanceMock = {
  play: vi.fn(() => Promise.resolve()),
  pause: vi.fn(),
  set onended(handler) {
    global.onendedHandler = handler;
  },
  get onended() {
    return global.onendedHandler;
  },
};

// This is the mock constructor that Vitest will use for `new Audio()`
const AudioMock = vi.fn().mockImplementation(() => global.audioInstanceMock);

vi.stubGlobal('Audio', AudioMock);


// 2. Reset mocks before each test run
beforeEach(() => {
  vi.clearAllMocks();
  global.onendedHandler = () => {};
});
