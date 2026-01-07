#!/usr/bin/env bun
import { Command } from "commander";
import { registerKubectlCommands } from "./commands/kubectl";
import { registerAzureCommands } from "./commands/azure";
import { registerMiscCommands } from "./commands/misc";
import { registerZshCommands } from "./commands/zsh";
import { registerReleaseCommands } from "./commands/release";
import pkg from "../package.json";

const program = new Command();

program
  .name("h")
  .description("CLI helper tools")
  .version(pkg.version)
  .action(() => {
    program.outputHelp();
  });

registerKubectlCommands(program);
registerAzureCommands(program);
registerMiscCommands(program);
registerZshCommands(program);
registerReleaseCommands(program);

program.parse();
