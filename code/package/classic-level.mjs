import Chalk from "chalk";
import { ClassicLevel } from "classic-level";
import { cleanPackEntry } from "./clean.mjs";
import getSubfolderName from "./folders.mjs";
import { closeSync, existsSync, openSync, mkdirSync } from "node:fs";
import { rm, writeFile } from "node:fs/promises";
import loadSources from "./load-sources.mjs";
import log from "../log.mjs";
import Path from "path";
import slugify from "./slugify.mjs";
import { collectionsForType, generateKeys, typeForCollection } from "./types.mjs";

/**
 * Load a pack from a directory and serialize the DB entries, each to their own file.
 * @param {object} packageData - Information on the package being unpacked.
 * @param {object} compendiumData - Information on the compendium being unpacked.
 * @param {object} argv - The command line arguments.
 * @returns {Promise<void>}
 */
export async function unpackClassicLevel(packageData, compendiumData, argv) {
	const filename = Path.join(packageData.directory, compendiumData.path.replace(/.db$/i, ""));
	if ( isFileLocked(Path.join(filename, "/LOCK")) ) {
		log(Chalk.red(
			`The pack "${Chalk.blue(packDir)}" is currently in use by Foundry VTT. Please close Foundry VTT and try again.`
		));
		return;
	}
	const db = new ClassicLevel(filename, { keyEncoded: "utf8", valueEncoding: "json" });

	const outputDir = Path.join(packageData.directory, `packs/_source/${compendiumData.name}`);
	if ( !argv.dryRun && !existsSync(outputDir) ) mkdirSync(outputDir, { recursive: true });
	const existingFiles = await loadSources(outputDir);

	if ( !argv.quiet ) log(`Unpacking "${Chalk.magenta(compendiumData.label)}" from ${
		Chalk.blue(filename)} into ${Chalk.blue(outputDir)}`);

	const documents = {};
	const folders = {};
	for await ( const [key, value] of db.iterator() ) {
		let [types, ids] = key.slice(1).split("!");
		types = types.split(".").slice(1);
		ids = ids.split(".");
		let collection = documents;
		let doc;
		while ( ids.length ) {
			doc = collection[ids.shift()] ??= {};
			if ( types.length ) collection = doc[types.shift()] ??= {};
		}
		doc.document = value;
		doc.document._key = key;
		if ( key.startsWith("!folders") ) folders[value._id] = { name: slugify(value.name), folder: value.folder };
	}

	for ( const folder of Object.values(folders) ) {
		let parent = folders[folder.folder];
		folder.path = folder.name;
		while ( parent ) {
			folder.path = Path.join(parent.name, folder.name);
			parent = folders[parent.folder];
		}
	}

	const rebuildDocument = (document, embedded) => {
		for ( const [collectionKey, entries] of Object.entries(embedded ?? {}) ) {
			document[collectionKey] = document[collectionKey].reduce((arr, id) => {
				const data = entries[id];
				if ( data ) {
					const { document: d, ...e } = data;
					rebuildDocument(d, e);
					arr.push(d);
				} else log(Chalk.red(
					`The document ${Chalk.blue(documentId)} was not found within the collection of "${Chalk.magenta(document.name)}".`
				));
				return arr;
			}, []);
		}
	};

	const stats = { created: 0, updated: 0, removed: 0 };
	for ( const { document, ...embedded } of Object.values(documents) ) {
		rebuildDocument(document, embedded);
		cleanPackEntry(document, { clearSourceId: true, clearSorting: true });

		let documentFilename;
		let subfolder;
		if ( document._id in folders ) {
			documentFilename = "_folder.json";
			subfolder = folders[document._id].path;
		} else {
			documentFilename = `${document.name ? `${slugify(document.name, {strict: true})}-${document._id}` : key}.json`;
			subfolder = argv.legacyFolders
				? getSubfolderName(document, compendiumData)
				: folders[document.folder]?.path ?? "";
		}
		const documentPath = Path.join(outputDir, subfolder, documentFilename);

		if ( !argv.dryRun && !existsSync(Path.join(outputDir, subfolder)) ) {
			mkdirSync(Path.join(outputDir, subfolder), { recursive: true });
		}

		const output = `${JSON.stringify(document, null, 2)}\n`;
		if ( !argv.dryRun ) writeFile(documentPath, output, { mode: 0o664 });
		if ( output !== existingFiles[documentPath] ) {
			if ( existingFiles[documentPath] ) {
				if ( !argv.quiet ) log(`${Chalk.blue("Updated")} ${Path.join(subfolder, documentFilename)}`);
				stats.updated++;
			} else {
				if ( !argv.quiet ) log(`${Chalk.green("Created")} ${Path.join(subfolder, documentFilename)}`);
				stats.created++;
			}
		}

		delete existingFiles[documentPath];
	}

	for ( const filename of Object.keys(existingFiles) ) {
		if ( !argv.dryRun ) rm(filename);
		if ( !argv.quiet ) log(`${Chalk.red("Removed")} ${filename.replace(`${outputDir}/`, "")}`);
		stats.removed++;
	}

	await db.close();

	log(`Unpacked ${Chalk.magenta(packageData.manifest.id)}.${Chalk.magenta(compendiumData.name)}: ${
		Chalk.green(stats.created)} created, ${Chalk.blue(stats.updated)} updated, ${Chalk.red(stats.removed)} removed`);
}

/* ~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~ */

/**
 * Pack multiple source files into a Classic Level database.
 * @param {object} packageData - Information on the package being packed.
 * @param {object} compendiumData - Information on the compendium being packed.
 * @param {object} argv - The command line arguments.
 * @returns {Promise<void>}
 */
export async function packClassicLevel(packageData, compendiumData, argv) {
	const filename = Path.join(packageData.directory, compendiumData.path.replace(/.db$/i, ""));
	if ( isFileLocked(Path.join(filename, "/LOCK")) ) {
		log(Chalk.red(
			`The pack "${Chalk.blue(packDir)}" is currently in use by Foundry VTT. Please close Foundry VTT and try again.`
		));
		return;
	}
	const db = new ClassicLevel(filename, { keyEncoded: "utf8", valueEncoding: "json" });
	const batch = db.batch();

	const sourceDir = Path.join(packageData.directory, `packs/_source/${compendiumData.name}`);
	let inputFiles = await loadSources(sourceDir, { parse: true });

	if ( !argv.quiet ) log(`Packing "${Chalk.magenta(compendiumData.label)}" from ${
		Chalk.blue(sourceDir)} into ${Chalk.blue(filename)}`);

	const flattenFile = (document, type) => {
		if ( document._key.startsWith("!folders") ) return;
		for ( const collectionKey of collectionsForType(type) ?? [] ) {
			const collectionType = typeForCollection(collectionKey);
			document[collectionKey] = document[collectionKey]?.reduce((arr, doc) => {
				inputFiles[doc._key] = doc;
				flattenFile(doc, collectionType);
				arr.push(doc._id);
				return arr;
			}, []);
		}
	};
	Object.entries(inputFiles).forEach(([k, f]) => {
		generateKeys(f, compendiumData.type);
		flattenFile(f, compendiumData.type);
	});

	const stats = { inserted: 0, updated: 0, removed: 0 };
	const seenKeys = new Set();
	for ( const file of Object.values(inputFiles) ) {
		const key = file._key;
		delete file._key;
		seenKeys.add(key);

		const name = file.name ?? file.label;
		try {
			const existing = await db.get(key);
			if ( JSON.stringify(file) !== JSON.stringify(existing) ) {
				if ( !argv.quiet ) log(`${Chalk.blue("Updated")} ${file._id}${name ? ` - ${name}` : ""}`);
				stats.updated++;
			}
		} catch(err) {
			if ( !argv.quiet ) log(`${Chalk.green("Inserted")} ${file._id}${name ? ` - ${name}` : ""}`);
			stats.inserted++;
		} finally {
			if ( !argv.dryRun ) batch.put(key, file);
		}
	}

	for ( const key of await db.keys().all() ) {
		if ( seenKeys.has(key) ) continue;
		const document = await db.get(key);
		if ( !argv.dryRun ) batch.del(key);
		if ( !argv.quiet ) log(`${Chalk.red("Removed")} ${document._id}${document.name ? ` - ${document.name}` : ""}`);
		stats.removed++;
	}

	if ( !argv.dryRun ) await batch.write();
	await db.close();

	log(`Packed ${Chalk.magenta(packageData.manifest.id)}.${Chalk.magenta(compendiumData.name)}: ${
		Chalk.green(stats.inserted)} inserted, ${Chalk.blue(stats.updated)} updated, ${Chalk.red(stats.removed)} removed`);
}

/* ~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~ */

/**
 * Determines whether a file is locked by another process
 * @param {string} filepath
 * @returns {boolean}
 */
function isFileLocked(filepath) {
	try {
		const fd = openSync(filepath, "w");
		closeSync(fd);
		return false;
	} catch(err) {
		if (err.code === "EBUSY") return true;
		else if (err.code === "ENOENT") return false;
		else throw err;
	}
}
