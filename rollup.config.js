import typescript from "rollup-plugin-typescript2";
import external from "rollup-plugin-peer-deps-external";

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
      external(),
      typescript({
        clean: true,
        useTsconfigDeclarationDir: true,
      }),
    ],
  },
];
