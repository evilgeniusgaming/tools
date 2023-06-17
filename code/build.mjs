import compileCSS from "./compile/css.mjs";
import compileJavascript from "./compile/javascript.mjs";
import log from "./log.mjs";
import { packNedb } from "./package/nedb.mjs";
import detectPackages from "./packages.mjs";

/**
 * Get the command object for the build command.
 * @returns {{handler: ((function(*): Promise<void>)|*), builder: builder, describe: string, command: string}}
 */
export default function getCommand() {
	return {
		command: "build",
		describe: "Run full build",
		builder: yargs => {
			yargs.option("id", {
				descibe: "ID of the package within which to work.",
				type: "string"
			});
		},
		handler: _handleBuild
	};

	/* ~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~ */

	/**
	 * Run all of the necessary build commands for project deployment.
	 * @param {object} argv - The command line arguments.
	 * @returns {Promise<void>}
	 * @private
	 */
	async function _handleBuild(argv) {
		for ( const packageData of Object.values(await detectPackages()) ) {
			for ( const stylePath of packageData.manifest.styles ?? [] ) {
				try {
					await compileCSS(packageData, stylePath, argv);
				} catch(err) {
					log(err.message);
				}
			}
			for ( const scriptPath of packageData.manifest.esmodules ?? [] ) {
				try {
					await compileJavascript(packageData, scriptPath, argv);
				} catch(err) {
					log(err.message);
				}
			}
			for ( const compendiumData of packageData.manifest.packs ?? [] ) {
				try {
					await packNedb(packageData, compendiumData, argv);
				} catch(err) {
					log(err.message);
				}
			}
		}
	}
}
