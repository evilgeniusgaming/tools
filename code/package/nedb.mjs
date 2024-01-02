import Chalk from "chalk";
import { cleanPackEntry } from "./clean.mjs";
import getSubfolderName from "./folders.mjs";
import Datastore from "nedb-promises";
import { existsSync, mkdirSync } from "node:fs";
import { rm, writeFile } from "node:fs/promises";
import loadSources from "./load-sources.mjs";
import log from "../log.mjs";
import Path from "path";
import slugify from "./slugify.mjs";
import { generateKeys } from "./types.mjs";

/**
 * Load a pack from a directory and serialize the DB entries, each to their own file
 * @param {object} packageData - Information on the package being unpacked.
 * @param {object} compendiumData - Information on the compendium being unpacked.
 * @param {object} argv - The command line arguments.
 * @returns {Promise<void>}
 */
export async function unpackNedb(packageData, compendiumData, argv) {
	const filename = Path.join(packageData.directory, compendiumData.path);
	const db = new Datastore({ filename, autoload: true });

	const outputDir = Path.join(packageData.directory, `packs/_source/${compendiumData.name}`);
	if ( !argv.dryRun && !existsSync(outputDir) ) mkdirSync(outputDir, { recursive: true });
	const existingFiles = await loadSources(outputDir);

	if ( !argv.quiet ) log(`Unpacking from ${Chalk.blue(filename)} into ${Chalk.blue(outputDir)}`);

	const stats = { created: 0, updated: 0, removed: 0 };
	for ( const document of await db.find({}) ) {
		cleanPackEntry(document, { clearSourceId: true, clearSorting: true });
		generateKeys(document, compendiumData.type);
		const documentFilename = `${slugify(document.name, {strict: true})}-${document._id}.json`;
		const subfolder = getSubfolderName(document, compendiumData);
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
		if ( !argv.quiet ) log(`${Chalk.red("Removed")} ${filename}`);
		stats.removed++;
	}

	log(`Unpacked ${Chalk.magenta(packageData.manifest.id)}.${Chalk.magenta(compendiumData.name)}: ${
		Chalk.green(stats.created)} created, ${Chalk.blue(stats.updated)} updated, ${Chalk.red(stats.removed)} removed`);
}

/* ~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~ */

/**
 * Pack multiple source files into a single NeDB file.
 * @param {object} packageData - Information on the package being packed.
 * @param {object} compendiumData - Information on the compendium being packed.
 * @param {object} argv - The command line arguments.
 * @returns {Promise<void>}
 */
export async function packNedb(packageData, compendiumData, argv) {
	const filename = Path.join(packageData.directory, compendiumData.path);
	const db = Datastore.create(filename);
	const sourceDir = Path.join(packageData.directory, `packs/_source/${compendiumData.name}`);
	const inputFiles = await loadSources(sourceDir, { parse: true });

	if ( !argv.quiet ) log(`Packing "${Chalk.magenta(compendiumData.label)}" from ${
		Chalk.blue(sourceDir)} into ${Chalk.blue(filename)}`);

	const stats = { inserted: 0, updated: 0, removed: 0 };
	const seenKeys = new Set();
	for ( const file of Object.values(inputFiles) ) {
		seenKeys.add(file._id);

		const existing = await db.findOne({ _id: file._id });
		if ( existing ) {
			if ( !argv.dryRun ) await db.update({ _id: file._id }, file);
			if ( JSON.stringify(file) !== JSON.stringify(existing) ) {
				if ( !argv.quiet ) log(`${Chalk.blue("Updated")} ${file._id}${file.name ? ` - ${file.name}` : ""}`);
				stats.updated++;
			}
		} else {
			if ( !argv.dryRun ) await db.insert(file);
			if ( !argv.quiet ) log(`${Chalk.green("Inserted")} ${file._id}${file.name ? ` - ${file.name}` : ""}`);
			stats.inserted++;
		}
	}

	const documents = await db.find({ _id: {$nin: Array.from(seenKeys)} });
	for ( const document of documents ) {
		if ( !argv.dryRun ) await db.remove({ _id: document._id }, {});
		if ( !argv.quiet ) log(`${Chalk.red("Removed")} ${document._id}${document.name ? ` - ${document.name}` : ""}`);
		stats.removed++;
	}

	if ( !argv.dryRun ) {
		db.stopAutocompaction();
		await new Promise(resolve => {
			db.compactDatafile(resolve);
		});
	}

	log(`Packed ${Chalk.magenta(packageData.manifest.id)}.${Chalk.magenta(compendiumData.name)}: ${
		Chalk.green(stats.inserted)} inserted, ${Chalk.blue(stats.updated)} updated, ${Chalk.red(stats.removed)} removed`);
}
