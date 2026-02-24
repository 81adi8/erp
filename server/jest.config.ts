import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: './src',
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/**/*.test.ts',
  ],
  // Global setup/teardown for database
  globalSetup: '<rootDir>/../jest.global-setup.ts',
  globalTeardown: '<rootDir>/../jest.global-teardown.ts',
  // Run env setup BEFORE any modules are imported
  setupFiles: ['<rootDir>/../jest.env.ts'],
  // Test-level setup (no DB connections here)
  setupFilesAfterEnv: ['<rootDir>/../jest.setup.ts'],
  coverageDirectory: '../coverage',
  collectCoverageFrom: [
    'modules/**/*.ts',
    '!modules/**/*.dto.ts',
    '!modules/**/index.ts',
    '!modules/**/*.types.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 60,
      lines: 60,
    },
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    // Transform TypeScript files
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: './tsconfig.json',
    }],
    // Transform ESM JavaScript files in node_modules
    '^.+\\.m?js$': 'ts-jest',
  },
  // Handle module aliases if needed
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@keycloak/keycloak-admin-client$': '<rootDir>/__mocks__/@keycloak/keycloak-admin-client.ts',
    '^uuid$': '<rootDir>/__mocks__/uuid.ts',
  },
  // Transform ESM modules from node_modules
  transformIgnorePatterns: [
    'node_modules/(?!(uuid|@keycloak|otplib|qrcode)/)',
  ],
  // Test timeout
  testTimeout: 30000,
  forceExit: true,
  detectOpenHandles: true,
  // Verbose output
  verbose: true,
  // Clear mocks between tests
  clearMocks: true,
  // Restore mocks after each test
  restoreMocks: true,
};

export default config;
