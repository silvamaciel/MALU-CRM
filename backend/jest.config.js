// backend/jest.config.js
module.exports = {
  testEnvironment: 'node',
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/config/', // Often, config files don't need direct testing
  ],
  // Automatically clear mock calls and instances between every test
  clearMocks: true,
  // Setup files to run before each test file (e.g., for global test DB setup)
  // setupFilesAfterEnv: ['./tests/setup.js'], // Example, if we create a setup file
  testMatch: [
    "**/__tests__/**/*.test.[jt]s?(x)", // Standard Jest pattern
    "**/?(*.)+(spec|test).[jt]s?(x)"
  ],
  collectCoverage: true,
  coverageDirectory: "coverage",
  coverageProvider: "v8", // or "babel"
  coverageReporters: ["json", "lcov", "text", "clover"],
};
