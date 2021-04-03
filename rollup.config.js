import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import esbuild from "rollup-plugin-esbuild";
import pkg from "./package.json";

/** @type {import('rollup').RollupOptions[]} */
const options = [
  {
    onwarn: function (warning) {
      // Skip certain warnings

      // should intercept ... but doesn't in some rollup versions
      if (warning.code === "THIS_IS_UNDEFINED") {
        return;
      }

      // console.warn everything else
      console.warn(warning.message);
    },
    input: "src/extension.ts",
    external: ["vscode"],
    output: {
      file: pkg.main,
      format: "cjs",
    },
    plugins: [
      resolve({
        browser: false,
        preferBuiltins: true,
      }),
      commonjs({
        ignoreGlobal: true,
      }),
      esbuild({
        minify: process.env.NODE_ENV === "production",
        sourceMap: process.env.NODE_ENV !== "production",
        target: "node10.4",
        define: {
          __VERSION__: JSON.stringify(pkg.version),
          COMMAND_NAMES: JSON.stringify(pkg.contributes.commands),
        },
      }),
    ],
  },
];

export default options;
