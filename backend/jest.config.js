module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['routes/**/*.js', 'models/**/*.js', 'middleware/**/*.js'],
  testMatch: ['**/__tests__/**/*.test.js'],
};