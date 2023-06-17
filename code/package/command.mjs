import Chalk from "chalk";
import { packClassicLevel, unpackClassicLevel } from "./classic-level.mjs";
import log from "../log.mjs";
import { packNedb, unpackNedb } from "./nedb.mjs";
import detectPackages from "../packages.mjs";

/**
 * Get the command object for the package command.
 * @returns {{handler: ((function(*): Promise<void>)|*), builder: builder, describe: string, command: string}}
 */
export default function getCommand() {
	return {
		command: "package [action] [value]",
		describe: "Manage packages",
		builder: yargs => {
			yargs.positional("action", {
				describe: "The action to perform",
				type: "string",
				choices: ["unpack", "pack"]
			});

			yargs.positional("value", {
				describe: "Name of the pack upon which to work.",
				type: "string"
			});

			yargs.option("id", {
				describe: "ID of the package within which to work.",
				type: "string"
			});

			yargs.option("prefix", {
				describe: "Prefix to use when searching for modules within subfolders.",
				type: "string"
			});

			yargs.option("pack", {
				alias: "n",
				describe: "Name of compendium pack to operate upon.",
				type: "string"
			});

			yargs.option("nedb", {
				describe: "Whether to use NeDB instead of ClassicLevel when packing & unpacking.",
				type: "boolean"
			});

			yargs.option("both", {
				describe: "Whether to pack both NeDB and ClassicLevel at the same time. Only available for the pack command.",
				type: "boolean"
			});

			yargs.option("verbose", {
				alias: "v",
				describe: "Enable verbose logging.",
				type: "boolean"
			});
		},
		handler: async argv => {
			switch ( argv.action ) {
				case "unpack":
					await _handleUnpack(argv);
					break;
				case "pack":
					await _handlePack(argv);
					break;
			}
		}
	};

	/* ~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~ */

	/**
	 * Load a pack from a directory and serialize the DB entries, each to their own file
	 * @param {object} argv - The command line arguments.
	 * @returns {Promise<void>}
	 * @private
	 */
	async function _handleUnpack(argv) {
		if ( argv.both ) {
			log(`${Chalk.red("Error:")} Operating on both database types not possible during unpacking.`);
			return;
		}
	
		const dbMode = argv.nedb ? "nedb" : "classic-level";
		const compendiumName = argv.pack ?? argv.value;
		const packages = await detectPackages({ id: argv.id, prefix: argv.prefix });

		// Loop through each package
		for ( const packageData of Object.values(packages) ) {
			// Loop through each pack in a package matching the pack filter, if provided
			for ( const compendiumData of packageData.manifest.packs ?? [] ) {
				if ( compendiumName && (compendiumData.name !== compendiumName) ) continue;
				try {
					if ( dbMode === "nedb" ) await unpackNedb(packageData, compendiumData, argv);
					else if ( dbMode === "classic-level" ) await unpackClassicLevel(packageData, compendiumData, argv);
				} catch(err) {
					log(err.message);
				}
			}
		}
	}

	/* ~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~ */

	/**
	 * Load separate source files and pack into a single database.
	 * @param {object} argv - The command line arguments.
	 * @returns {Promise<void>}
	 * @private
	 */
	async function _handlePack(argv) {
		const dbMode = argv.both ? "both" : argv.nedb ? "nedb" : "classic-level";
		const compendiumName = argv.pack ?? argv.value;
		const packages = await detectPackages({ id: argv.id, prefix: argv.prefix });

		// Loop through each package
		for ( const packageData of Object.values(packages) ) {
			// Loop through each pack in a package matching the pack filter, if provided
			for ( const compendiumData of packageData.manifest.packs ?? [] ) {
				if ( compendiumName && (compendiumData.name !== compendiumName) ) continue;
				try {
					if ( ["nedb", "both"].includes(dbMode) ) await packNedb(packageData, compendiumData, argv);
					if ( ["classic-level", "both"].includes(dbMode) ) await packClassicLevel(packageData, compendiumData, argv);
				} catch(err) {
					log(err.message);
				}
			}
		}
	}
}
