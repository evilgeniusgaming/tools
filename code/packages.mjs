import Chalk from "chalk";
import { readdir, readFile } from "node:fs/promises";
import log from "./log.mjs";
import Path from "path";

/**
 * Scan the folder for package manifests.
 * @param {object} [params]
 * @param {string} [params.id] - Detect a module with a specific ID.
 * @param {string} [params.prefix] - Find all modules within folders with this prefix.
 * @returns {Object<string, object>} - Mapping of module IDs and manifest contents.
 */
export default async function detectPackages({ id, prefix }={}) {
	const manifestNames = ["system", "module", "world"];

	const paths = [];
	if ( prefix ) {
		const directory = await readdir("./", { withFileTypes: true });
		for ( const entry of directory ) {
			if ( !entry.isDirectory() || !entry.name.startsWith(prefix) ) continue;
			paths.push(entry.name);
		}
	} else {
		paths.push(id ?? "./");
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
		if ( id && manifest?.id !== id ) continue;
		if ( manifest ) packages[manifest.id] = { type, directory, manifest };
	}

	if ( !Object.keys(packages).length ) log(Chalk.red("No packages detected"));

	return packages;
}
