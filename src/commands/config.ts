import { Command } from "commander";
import { select, input, confirm, checkbox } from "@inquirer/prompts";
import { loadConfig, saveConfig, type HConfig } from "../utils/config";
import { success, info, warn } from "../utils/icons";
import { execInteractive } from "../utils/exec";
import { existsSync } from "fs";
import { join } from "path";
import chalk from "chalk";

// ============== Interactive Config Editor ==============

async function interactiveConfigEditor(): Promise<void> {
  let continueEditing = true;

  while (continueEditing) {
    const cfg = loadConfig();
    console.log();

    const section = await select({
      message: "What would you like to configure?",
      choices: [
        {
          name: `🤖 AI Provider ${chalk.gray(`(${cfg.ai.provider})`)}`,
          value: "ai",
        },
        {
          name: `🔔 Updates ${chalk.gray(`(${cfg.updates.checkOnStartup ? "enabled" : "disabled"})`)}`,
          value: "updates",
        },
        {
          name: `📁 Dotfiles ${chalk.gray(`(autoPush: ${cfg.dots?.autoPush ? "on" : "off"})`)}`,
          value: "dots",
        },
        {
          name: "📝 Open in editor (raw JSON)",
          value: "raw",
        },
        {
          name: chalk.gray("← Exit"),
          value: "exit",
        },
      ],
    });

    if (section === "exit") {
      continueEditing = false;
      continue;
    }

    if (section === "raw") {
      const configPath = join(process.env.HOME || "~", ".h.config.json");
      const editor = process.env.EDITOR || process.env.VISUAL || "nvim";
      await execInteractive([editor, configPath]);
      success("Configuration updated");
      continue;
    }

    if (section === "ai") {
      await configureAI(cfg);
    } else if (section === "updates") {
      await configureUpdates(cfg);
    } else if (section === "dots") {
      await configureDots(cfg);
    }
  }

  console.log();
}

async function configureAI(cfg: HConfig): Promise<void> {
  console.log();
  console.log(chalk.bold("🤖 AI Configuration"));
  console.log();

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
  console.log();
  success(`AI provider: ${provider}`);
  if (provider === "ollama" && newConfig.ai.ollama) {
    info(`Model: ${newConfig.ai.ollama.model}`);
    info(`Base URL: ${newConfig.ai.ollama.baseUrl}`);
  }
}

async function configureUpdates(cfg: HConfig): Promise<void> {
  console.log();
  console.log(chalk.bold("🔔 Update Settings"));
  console.log();

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
  console.log();
  success(`Update check: ${checkOnStartup ? "enabled" : "disabled"}`);
}

async function configureDots(cfg: HConfig): Promise<void> {
  console.log();
  console.log(chalk.bold("📁 Dotfiles Configuration"));
  console.log();

  const dots = cfg.dots || {
    sourceDir: "~/.local/share/chezmoi",
    targetDir: "~",
    ignoredPatterns: [
      ".DS_Store",
      "*.swp",
      "*.swo",
      "*~",
      ".git",
      "node_modules",
      "__pycache__",
      ".cache",
    ],
    autoPush: false,
    checkInterval: 24,
    diffTool: undefined,
  };

  const checkIntervalLabel = dots.checkInterval === 0 ? "disabled" : `every ${dots.checkInterval}h`;
  const diffToolLabel = dots.diffTool || "auto-detect";

  const action = await select({
    message: "What would you like to configure?",
    choices: [
      {
        name: `Auto-push ${chalk.gray(`(${dots.autoPush ? "enabled" : "disabled"})`)}`,
        value: "autoPush",
      },
      {
        name: `Sync check ${chalk.gray(`(${checkIntervalLabel})`)}`,
        value: "checkInterval",
      },
      {
        name: `Diff tool ${chalk.gray(`(${diffToolLabel})`)}`,
        value: "diffTool",
      },
      {
        name: `Source directory ${chalk.gray(`(${dots.sourceDir})`)}`,
        value: "sourceDir",
      },
      {
        name: `Target directory ${chalk.gray(`(${dots.targetDir})`)}`,
        value: "targetDir",
      },
      {
        name: `Ignored patterns ${chalk.gray(`(${dots.ignoredPatterns.length} patterns)`)}`,
        value: "ignored",
      },
      {
        name: chalk.gray("← Back"),
        value: "back",
      },
    ],
  });

  if (action === "back") return;

  if (action === "autoPush") {
    const autoPush = await confirm({
      message: "Auto-commit and push after dots changes?",
      default: dots.autoPush,
    });

    const newConfig: HConfig = {
      ...cfg,
      dots: { ...dots, autoPush },
    };
    saveConfig(newConfig);
    console.log();
    success(`Auto-push: ${autoPush ? "enabled" : "disabled"}`);
  } else if (action === "checkInterval") {
    const intervalChoice = await select({
      message: "How often should h check for dotfiles changes?",
      choices: [
        { name: "Disabled", value: 0 },
        { name: "Every 6 hours", value: 6 },
        { name: "Every 12 hours", value: 12 },
        { name: "Every 24 hours (daily)", value: 24 },
        { name: "Every 48 hours", value: 48 },
        { name: "Every 168 hours (weekly)", value: 168 },
        { name: "Custom...", value: -1 },
      ],
      default: dots.checkInterval,
    });

    let checkInterval = intervalChoice;

    if (intervalChoice === -1) {
      const customInterval = await input({
        message: "Enter interval in hours (0 to disable):",
        default: String(dots.checkInterval),
        validate: (value) => {
          const num = parseInt(value, 10);
          if (isNaN(num) || num < 0) return "Please enter a valid number >= 0";
          return true;
        },
      });
      checkInterval = parseInt(customInterval, 10);
    }

    const newConfig: HConfig = {
      ...cfg,
      dots: { ...dots, checkInterval },
    };
    saveConfig(newConfig);
    console.log();
    if (checkInterval === 0) {
      success("Sync check: disabled");
    } else {
      success(`Sync check: every ${checkInterval} hours`);
    }
  } else if (action === "diffTool") {
    const toolChoice = await select({
      message: "Select diff/merge tool:",
      choices: [
        { name: "Auto-detect", value: "" },
        { name: "vimdiff (vim)", value: "vimdiff" },
        { name: "nvim -d (neovim)", value: "nvim -d" },
        { name: "meld", value: "meld" },
        { name: "opendiff (macOS FileMerge)", value: "opendiff" },
        { name: "VS Code", value: "code --diff --wait" },
        { name: "Custom...", value: "custom" },
      ],
      default: dots.diffTool || "",
    });

    let diffTool: string | undefined = toolChoice || undefined;

    if (toolChoice === "custom") {
      const customTool = await input({
        message: "Enter diff command (e.g., 'meld' or 'code --diff --wait'):",
        default: dots.diffTool || "",
      });
      diffTool = customTool.trim() || undefined;
    }

    const newConfig: HConfig = {
      ...cfg,
      dots: { ...dots, diffTool },
    };
    saveConfig(newConfig);
    console.log();
    success(`Diff tool: ${diffTool || "auto-detect"}`);
  } else if (action === "sourceDir") {
    const sourceDir = await input({
      message: "Source directory (dotfiles repo):",
      default: dots.sourceDir,
    });

    const newConfig: HConfig = {
      ...cfg,
      dots: { ...dots, sourceDir },
    };
    saveConfig(newConfig);
    console.log();
    success(`Source directory: ${sourceDir}`);
  } else if (action === "targetDir") {
    const targetDir = await input({
      message: "Target directory (usually home):",
      default: dots.targetDir,
    });

    const newConfig: HConfig = {
      ...cfg,
      dots: { ...dots, targetDir },
    };
    saveConfig(newConfig);
    console.log();
    success(`Target directory: ${targetDir}`);
  } else if (action === "ignored") {
    await configureIgnoredPatterns(cfg, dots);
  }
}

async function configureIgnoredPatterns(
  cfg: HConfig,
  dots: NonNullable<HConfig["dots"]>
): Promise<void> {
  console.log();
  console.log(chalk.bold("Ignored Patterns"));
  console.log(chalk.gray("These files/folders will be skipped when adding dotfiles\n"));

  const action = await select({
    message: "What would you like to do?",
    choices: [
      { name: "View current patterns", value: "view" },
      { name: "Add new pattern", value: "add" },
      { name: "Remove patterns", value: "remove" },
      { name: "Reset to defaults", value: "reset" },
      { name: chalk.gray("← Back"), value: "back" },
    ],
  });

  if (action === "back") return;

  if (action === "view") {
    console.log();
    console.log(chalk.bold("Current patterns:"));
    dots.ignoredPatterns.forEach((p) => console.log(`  • ${p}`));
  } else if (action === "add") {
    const pattern = await input({
      message: "Enter pattern to ignore (e.g., *.log, .cache, secret*):",
    });

    if (pattern.trim()) {
      const newPatterns = [...dots.ignoredPatterns, pattern.trim()];
      const newConfig: HConfig = {
        ...cfg,
        dots: { ...dots, ignoredPatterns: newPatterns },
      };
      saveConfig(newConfig);
      console.log();
      success(`Added pattern: ${pattern}`);
    }
  } else if (action === "remove") {
    if (dots.ignoredPatterns.length === 0) {
      warn("No patterns to remove");
      return;
    }

    const toRemove = await checkbox({
      message: "Select patterns to remove:",
      choices: dots.ignoredPatterns.map((p) => ({ name: p, value: p })),
    });

    if (toRemove.length > 0) {
      const newPatterns = dots.ignoredPatterns.filter((p) => !toRemove.includes(p));
      const newConfig: HConfig = {
        ...cfg,
        dots: { ...dots, ignoredPatterns: newPatterns },
      };
      saveConfig(newConfig);
      console.log();
      success(`Removed ${toRemove.length} pattern(s)`);
    }
  } else if (action === "reset") {
    const confirmed = await confirm({
      message: "Reset to default patterns?",
      default: false,
    });

    if (confirmed) {
      const defaultPatterns = [
        ".DS_Store",
        "*.swp",
        "*.swo",
        "*~",
        ".git",
        "node_modules",
        "__pycache__",
        ".cache",
      ];
      const newConfig: HConfig = {
        ...cfg,
        dots: { ...dots, ignoredPatterns: defaultPatterns },
      };
      saveConfig(newConfig);
      console.log();
      success("Patterns reset to defaults");
    }
  }
}

// ============== Register Commands ==============

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
    .description("Interactive configuration editor")
    .action(async () => {
      await interactiveConfigEditor();
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
        dots: {
          sourceDir: "~/.local/share/chezmoi",
          targetDir: "~",
          ignoredPatterns: [
            ".DS_Store",
            "*.swp",
            "*.swo",
            "*~",
            ".git",
            "node_modules",
            "__pycache__",
            ".cache",
          ],
          autoPush: false,
          checkInterval: 24,
        },
      };

      saveConfig(defaultConfig);
      success("Configuration reset to defaults");
      console.log();
    });
}
