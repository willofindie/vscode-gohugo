const esbuild = require("esbuild");
const pkg = require("../package.json");

/**
 * Somehow Rollup ESBUILD Plugin is not working
 * properly, so have to go with esbuild
 * compile directly.
 *
 * Using target: "node10.4" solves the issue
 */
/**
 * @type {import('esbuild').BuildOptions}
 */
const options = {
  minify: true,
  target: "node10.4",
  platform: "node",
  external: ["vscode"],
  outfile: "out/extension.js",
  define: {
    __VERSION__: JSON.stringify(pkg.version),
    COMMAND_NAMES: JSON.stringify(pkg.contributes.commands),
  },
};

esbuild.build(options).catch(() => process.exit(1));
