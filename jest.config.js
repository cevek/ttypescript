module.exports = {
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  moduleNameMapper: {
    "^ttypescript/lib/(.*?)$": "<rootDir>/packages/ttypescript/src/$1",
    "^ttypescript$": "<rootDir>/packages/ttypescript/src/typescript",
    "^ttypescript-(.*?)$": "<rootDir>/packages/ttypescript-$1/src"
  },
  rootDir: __dirname,
  testMatch: [
    "<rootDir>/packages/*/__tests__/**/*spec.@(js|ts)?(x)",
  ],
  transform: {
    "^.+\\.tsx?$": "ts-jest"
  }
};
