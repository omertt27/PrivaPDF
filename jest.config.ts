import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "jest-environment-jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  testMatch: ["<rootDir>/src/**/__tests__/**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: { jsx: "react-jsx" } }],
  },
  projects: [
    {
      // usage-gate and other localStorage-based tests run in jsdom
      displayName: "client",
      preset: "ts-jest",
      testEnvironment: "jest-environment-jsdom",
      moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
      testMatch: ["<rootDir>/src/lib/__tests__/**/*.test.ts"],
      transform: {
        "^.+\\.tsx?$": ["ts-jest", { tsconfig: { jsx: "react-jsx" } }],
      },
    },
    {
      // API route tests run in Node so Web fetch globals (Request, Response) are available
      displayName: "api",
      preset: "ts-jest",
      testEnvironment: "node",
      moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
      testMatch: ["<rootDir>/src/app/api/__tests__/**/*.test.ts"],
      transform: {
        "^.+\\.tsx?$": ["ts-jest", { tsconfig: { jsx: "react-jsx" } }],
      },
    },
  ],
};

export default config;
