import Chalk from "chalk";
import CleanCSS from "clean-css";
import { writeFile } from "node:fs/promises";
import log from "../log.mjs";
import Path from "path";
import { rollup } from "rollup";

/**
 * Rollup all imported styles into a single CSS file.
 * @param {object} packageData - Information on the package being unpacked.
 * @param {object} stylePath - Path of the style to be compiled.
 * @param {object} argv - The command line arguments.
 * @returns {Promise<void>}
 */
export default async function compileCSS(packageData, stylePath, argv) {
	const inputPath = Path.join(packageData.directory, stylePath);
	const compiledPath = Path.join(
		packageData.directory, Path.dirname(stylePath),
		`${Path.basename(stylePath, Path.extname(stylePath))}-compiled${Path.extname(stylePath)}`
	);

	log(`Compiling ${Chalk.blue(inputPath)} into ${Chalk.blue(compiledPath)}`);

	const bundle = new CleanCSS({
		format: "beautify",
		inline: ["local"],
		level: 0,
		returnPromise: true
	});
	const output = await bundle.minify([inputPath]);

	await writeFile(compiledPath, output.styles, { mode: 0o664 });
}
