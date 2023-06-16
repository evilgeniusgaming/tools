#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import packageCommand from "./package/command.mjs";

const argv = yargs(hideBin(process.argv))
	.command(packageCommand())
	.help().alias("help", "h")
	.argv;
