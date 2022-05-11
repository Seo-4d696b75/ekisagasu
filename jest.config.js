module.exports = {
  roots: [
    "<rootDir>/src/test"
  ],
  testMatch: [
    "**/*.test.(ts|tsx)"
  ],
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest"
  },
  globals: {
    "ts-jest": {
      tsconfig: "tsconfig.test.json"
    }
  }
}