#!/usr/bin/env bun
import { Command } from "commander";
import { registerKubectlCommands } from "./commands/kubectl";
import { registerAzureCommands } from "./commands/azure";
import { registerMiscCommands } from "./commands/misc";
import { registerZshCommands } from "./commands/zsh";

const program = new Command();

program
  .name("h")
  .description("CLI helper tools")
  .version("1.0.0")
  .action(() => {
    program.outputHelp();
  });

registerKubectlCommands(program);
registerAzureCommands(program);
registerMiscCommands(program);
registerZshCommands(program);

program.parse();
