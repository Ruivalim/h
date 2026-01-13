import { Command } from "commander";
import { select, input, confirm } from "@inquirer/prompts";
import { loadConfig, saveConfig, type HConfig } from "../utils/config";
import { success, info, error } from "../utils/icons";
import { execInteractive } from "../utils/exec";
import { existsSync } from "fs";
import { join } from "path";

export function registerConfigCommands(program: Command): void {
  const config = program.command("config").description("Manage h CLI configuration");

  config
    .command("show")
    .description("Show current configuration")
    .action(() => {
      const cfg = loadConfig();
      console.log("\n📋 Current configuration:\n");
      console.log(JSON.stringify(cfg, null, 2));
      console.log();
      info(`Config file: ${join(process.env.HOME || "~", ".h.config.json")}`);
      console.log();
    });

  config
    .command("edit")
    .description("Edit configuration in your default editor")
    .action(async () => {
      const configPath = join(process.env.HOME || "~", ".h.config.json");

      // Ensure config exists
      if (!existsSync(configPath)) {
        loadConfig(); // This will create the default config
        info("Created default configuration file");
      }

      const editor = process.env.EDITOR || process.env.VISUAL || "nvim";
      await execInteractive([editor, configPath]);
      success("Configuration updated");
    });

  config
    .command("set-ai")
    .description("Configure AI provider (Claude or Ollama)")
    .action(async () => {
      const cfg = loadConfig();

      console.log("\n🤖 Configure AI Provider\n");

      const provider = await select<"claude" | "ollama">({
        message: "Select AI provider:",
        choices: [
          { name: "Claude Code CLI", value: "claude" },
          { name: "Ollama (local)", value: "ollama" },
        ],
        default: cfg.ai.provider,
      });

      const newConfig: HConfig = {
        ...cfg,
        ai: {
          ...cfg.ai,
          provider,
        },
      };

      if (provider === "ollama") {
        console.log();
        info("Configuring Ollama settings...\n");

        const model = await input({
          message: "Ollama model:",
          default: cfg.ai.ollama?.model || "llama3.2",
        });

        const baseUrl = await input({
          message: "Ollama base URL:",
          default: cfg.ai.ollama?.baseUrl || "http://localhost:11434",
        });

        newConfig.ai.ollama = { model, baseUrl };
      }

      saveConfig(newConfig);
      success(`AI provider set to: ${provider}`);

      if (provider === "ollama" && newConfig.ai.ollama) {
        info(`Model: ${newConfig.ai.ollama.model}`);
        info(`Base URL: ${newConfig.ai.ollama.baseUrl}`);
      }

      console.log();
    });

  config
    .command("set-updates")
    .description("Configure auto-update check behavior")
    .action(async () => {
      const cfg = loadConfig();

      console.log("\n🔔 Configure Update Notifications\n");

      const checkOnStartup = await confirm({
        message: "Check for updates on CLI startup?",
        default: cfg.updates.checkOnStartup,
      });

      const newConfig: HConfig = {
        ...cfg,
        updates: {
          ...cfg.updates,
          checkOnStartup,
        },
      };

      saveConfig(newConfig);
      success(`Update check on startup: ${checkOnStartup ? "enabled" : "disabled"}`);
      console.log();
    });

  config
    .command("reset")
    .description("Reset configuration to defaults")
    .action(async () => {
      console.log();
      const confirmed = await confirm({
        message: "Are you sure you want to reset configuration to defaults?",
        default: false,
      });

      if (!confirmed) {
        info("Reset cancelled");
        return;
      }

      const defaultConfig: HConfig = {
        ai: {
          provider: "claude",
        },
        updates: {
          checkOnStartup: true,
        },
      };

      saveConfig(defaultConfig);
      success("Configuration reset to defaults");
      console.log();
    });
}
