import Chalk from "chalk";
import { readFile } from "node:fs/promises";
import log from "./log.mjs";
import Path from "path";

/**
 * Scan the folder for package manifests.
 * @param {string} [prefix] - Folder prefix to search subfolders.
 * @returns {Object<string, object>} - Mapping of module IDs and manifest contents.
 */
export default async function detectPackages(prefix) {
	const manifestNames = ["system", "module", "world"];

	const paths = [];
	if ( prefix ) {
		// TODO: Find all packages with prefix
	} else {
		paths.push("./");
	}

	const packages = {};
	for ( const directory of paths ) {
		let manifest;
		let type;
		for ( const manifestType of manifestNames ) {
			try {
				const manifestPath = Path.join(directory, `${manifestType}.json`);
				manifest = JSON.parse(await readFile(manifestPath, { encoding: "utf8" }));
				type = manifestType;
			} catch(err) {
				continue;
			}
			break;
		}
		if ( manifest ) packages[manifest.id] = { type, directory, manifest };
	}

	if ( !Object.keys(packages).length ) log(Chalk.red("No packages detected"));

	return packages;
}
