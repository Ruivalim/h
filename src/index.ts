#!/usr/bin/env bun
import { Command } from "commander";
import { registerKubectlCommands } from "./commands/kubectl";
import { registerAzureCommands } from "./commands/azure";
import { registerMiscCommands } from "./commands/misc";
import { registerZshCommands } from "./commands/zsh";
import { registerReleaseCommands } from "./commands/release";
import { registerConfigCommands } from "./commands/config";
import { registerDotsCommands, checkDotfilesOnStartup } from "./commands/dots";
import { checkForUpdates } from "./utils/update";
import pkg from "../package.json";

// Graceful shutdown handling
function gracefulExit(code = 0): void {
  console.log();
  process.exit(code);
}

// Handle SIGINT (Ctrl+C)
process.on("SIGINT", () => gracefulExit(0));
process.on("SIGTERM", () => gracefulExit(0));

// Handle uncaught errors from inquirer prompts
process.on("uncaughtException", (error) => {
  if (error.name === "ExitPromptError") {
    gracefulExit(0);
  } else {
    console.error(error);
    process.exit(1);
  }
});

// Check for updates in the background (non-blocking)
checkForUpdates().catch(() => {
  // Silently ignore errors
});

// Check dotfiles status periodically (non-blocking)
checkDotfilesOnStartup().catch(() => {
  // Silently ignore errors
});

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
registerConfigCommands(program);
registerDotsCommands(program);

program.parse();
