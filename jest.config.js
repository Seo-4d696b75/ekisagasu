module.exports = {
  roots: [
    "<rootDir>/src/test"
  ],
  testMatch: [
    "**/*.test.(ts|tsx)"
  ],
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.test.json",
      },
    ],
  },
  moduleNameMapper: {
    "\\.(jpg|ico|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$": "<rootDir>/__mocks__/fileMock.ts",
    "\\.(css|scss)$": "<rootDir>/__mocks__/styleMock.ts",
  },
}