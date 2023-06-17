import compileCSS from "./css.mjs";
import compileJavascript from "./javascript.mjs";
import log from "../log.mjs";
import detectPackages from "../packages.mjs";

/**
 * Get the command object for the rollup command.
 * @returns {{handler: ((function(*): Promise<void>)|*), builder: builder, describe: string, command: string}}
 */
export default function getCommand() {
	return {
		command: "compile [action] [value]",
		describe: "Compile Code & Styles",
		builder: yargs => {
			yargs.positional("action", {
				describe: "The action to perform",
				type: "string",
				choices: ["css", "javascript"]
			});

			yargs.option("id", {
				descibe: "ID of the package within which to work.",
				type: "string"
			});

			yargs.option("prefix", {
				descibe: "Prefix to use when searching for modules within subfolders.",
				type: "string"
			});
		},
		handler: async argv => {
			switch ( argv.action ) {
				case "css":
					await _handleCSS(argv);
					break;
				case "javascript":
					await _handleJavascript(argv);
					break;
			}
		}
	};

	/* ~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~ */

	/**
	 * Rollup all the package's CSS into a single file.
	 * @param {object} argv - The command line arguments.
	 * @returns {Promise<void>}
	 * @private
	 */
	async function _handleCSS(argv) {
		for ( const packageData of Object.values(await detectPackages({ id: argv.id, prefix: argv.prefix })) ) {
			for ( const stylePath of packageData.manifest.styles ?? [] ) {
				try {
					await compileCSS(packageData, stylePath, argv);
				} catch(err) {
					log(err.message);
				}
			}
		}
	}

	/* ~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~ */

	/**
	 * Rollup all the package's javascript into a single file.
	 * @param {object} argv - The command line arguments.
	 * @returns {Promise<void>}
	 * @private
	 */
	async function _handleJavascript(argv) {
		for ( const packageData of Object.values(await detectPackages({ id: argv.id, prefix: argv.prefix })) ) {
			for ( const scriptPath of packageData.manifest.esmodules ?? [] ) {
				try {
					await compileJavascript(packageData, scriptPath, argv);
				} catch(err) {
					log(err.message);
				}
			}
		}
	}
}
