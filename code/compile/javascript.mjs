import Chalk from "chalk";
import log from "../log.mjs";
import Path from "path";
import { rollup } from "rollup";

/**
 * Rollup all the package's javascript into a single file.
 * @param {object} packageData - Information on the package being unpacked.
 * @param {object} scriptPath - Path of the script to be compiled.
 * @param {object} argv - The command line arguments.
 * @returns {Promise<void>}
 */
export default async function compileJavascript(packageData, scriptPath, argv) {
  const inputPath = Path.join(packageData.directory, scriptPath);
  const compiledPath = Path.join(
    packageData.directory, Path.dirname(scriptPath),
    `${Path.basename(scriptPath, Path.extname(scriptPath))}-compiled${Path.extname(scriptPath)}`
  );

  log(`Compiling ${Chalk.blue(inputPath)} into ${Chalk.blue(compiledPath)}`);

  const bundle = await rollup({
    input: inputPath
  });
  await bundle.write({
    file: compiledPath,
    format: "es",
    sourcemap: true,
    sourcemapFile: scriptPath
  });
}
