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

// Mock import.meta for Vite
global.importMeta = {
  env: {
    VITE_GEMINI_API_KEY: 'test-api-key',
  },
};
