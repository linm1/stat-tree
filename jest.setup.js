require('@testing-library/jest-dom');

// Mock tldraw canvas operations
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = jest.fn();
}

global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock requestAnimationFrame to execute synchronously in tests
global.requestAnimationFrame = (callback) => {
  return setTimeout(callback, 0);
};
global.cancelAnimationFrame = (id) => {
  clearTimeout(id);
};

// Mock import.meta for Vite
global.importMeta = {
  env: {
    VITE_GEMINI_API_KEY: 'test-api-key',
  },
};
