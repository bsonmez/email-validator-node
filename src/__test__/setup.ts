/**
 * Jest setup file for email-validator-node tests
 */

// Increase timeout for DNS tests
jest.setTimeout(10000);

// Mock console methods to reduce test noise
global.console = {
  ...console,
  // Uncomment to suppress console.log in tests
  // log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};