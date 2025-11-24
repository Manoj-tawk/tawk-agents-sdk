module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/tests/integration/', '/tests/e2e/', '/tests/performance/', '/integration/'],
  transformIgnorePatterns: ['node_modules/(?!(@toon-format)/)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/types/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^@tawk-agents-sdk/core$': '<rootDir>/src/index.ts',
    '^@tawk-agents-sdk/core/(.*)$': '<rootDir>/src/$1',
    '^@toon-format/toon$': '<rootDir>/tests/unit/__mocks__/toon-format.ts',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.tests.json'
    }]
  },
  setupFilesAfterEnv: ['<rootDir>/tests/utils/setup.ts'],
  testTimeout: 30000,
};

