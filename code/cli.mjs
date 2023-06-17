#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import compileCommand from "./compile/command.mjs";
import packageCommand from "./package/command.mjs";

const argv = yargs(hideBin(process.argv))
	.command(compileCommand())
	.command(packageCommand())
	.help().alias("help", "h")
	.argv;
