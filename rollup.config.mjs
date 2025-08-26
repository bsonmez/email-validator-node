import typescript from "rollup-plugin-typescript2";

export default [
  {
    input: "./src/index.ts",
    output: [
      {
        file: "./lib/index.js",
        format: "cjs",
        sourcemap: true,
        exports: "named",
      },
    ],
    plugins: [
      typescript({
        clean: true,
        useTsconfigDeclarationDir: true,
        tsconfig: "./tsconfig.json"
      }),
    ],
    external: ['dns'],
  },
  {
    input: "./src/blacklist.ts",
    output: [
      {
        file: "./lib/blacklist.js",
        format: "cjs",
        sourcemap: true,
        exports: "named",
      },
    ],
    plugins: [
      typescript({
        clean: true,
        useTsconfigDeclarationDir: true,
        tsconfig: "./tsconfig.json"
      }),
    ],
  },
];
