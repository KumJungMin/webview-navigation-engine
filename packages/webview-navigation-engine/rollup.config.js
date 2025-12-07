import typescript from "@rollup/plugin-typescript";

const createConfig = (input, output, format) => ({
  input,
  output: {
    file: output,
    format,
    sourcemap: true,
    exports: "named",
  },
  plugins: [
    typescript({
      tsconfig: "./tsconfig.json",
      declaration: false,
      declarationMap: false,
    }),
  ],
  external: (id) => !id.startsWith(".") && !id.startsWith("/"),
});

// Main entry points
const mainInputs = {
  index: "src/index.ts",
  "adapters/vue": "src/adapters/vue.ts",
  "adapters/react": "src/adapters/react.ts",
};

export default Object.entries(mainInputs).flatMap(([name, input]) => [
  // ESM build
  createConfig(input, `dist/${name}.esm.js`, "es"),
  // CJS build
  createConfig(input, `dist/${name}.cjs.js`, "cjs"),
]);

