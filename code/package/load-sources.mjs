import { readdir, readFile } from "node:fs/promises";
import Path from "path";

/**
 * Load all of the JSON files within the target directory and all sub-directories.
 * @param {string} path - Directory to search.
 * @param {object} [options={}]
 * @param {boolean} [options.parse=false] - Should the file be parsed as JSON?
 * @returns {Object<string, data>} - Mapping of filenames to JSON contents.
 */
export default async function loadSources(path, { parse=false }={}) {
	const files = {};
	await _loadSources(path, files, parse);
	return files;
}

/**
 * Internal recursive function for searching sub-folders.
 * @param {string} path - Directory to search.
 * @param {Object<string, data>} files - Mapping of filenames to JSON contents.
 * @param {boolean} parse - Should the file be parsed as JSON?
 * @private
 */
async function _loadSources(path, files, parse) {
	try {
		const directory = await readdir(path, { withFileTypes: true });
		for ( const entry of directory ) {
			const entryPath = Path.join(path, entry.name);
			if ( entry.isDirectory() ) await _loadSources(entryPath, files, parse);
			else if ( entryPath.endsWith(".json") ) {
				const file = await readFile(entryPath, { encoding: "utf8" });
				files[entryPath] = parse ? JSON.parse(file) : file;
			}
		}
	} catch(err) {
		console.error(err);
	}
}
