import { Command } from "commander";
import { exec, execInteractive, withSpinner } from "../utils/exec";
import { info, success, error } from "../utils/icons";
import { select, search } from "../utils/prompt";
import { readdir } from "node:fs/promises";

export function registerMiscCommands(program: Command): void {
  program
    .command("oxker")
    .description("Run oxker docker TUI")
    .action(async () => {
      await execInteractive([
        "docker",
        "run",
        "--rm",
        "-it",
        "-v",
        "/var/run/docker.sock:/var/run/docker.sock:ro",
        "--pull=always",
        "mrjackwills/oxker",
      ]);
    });

  program
    .command("update-abi")
    .description("Update abi brew backups")
    .action(async () => {
      const date = new Date()
        .toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "2-digit",
        })
        .replace(/\//g, "-");

      info(`Backing up brew formula to brew-formula-${date}`);
      await execInteractive(["abi", "leaves", "-f", `brew-formula-${date}`]);

      info(`Backing up brew cask to brew-cask-${date}`);
      await execInteractive(["abi", "cask", "-f", `brew-cask-${date}`]);
    });

  const isHyprland = process.platform === "linux" && process.env.HYPRLAND_INSTANCE_SIGNATURE;

  if (isHyprland) {
    program
      .command("screen-reset")
      .description("Reset screen resolution")
      .action(async () => {
        await execInteractive(["hyprctl", "keyword", "monitor", ",preferred,auto,1"]);
      });

    program
      .command("screen-fhd")
      .description("Set screen to 1080p")
      .action(async () => {
        await execInteractive(["hyprctl", "keyword", "monitor", ",1920x1080@60,0x0,1"]);
      });
  }

  program
    .command("edit-nvim")
    .description("Edit neovim config")
    .action(async () => {
      await execInteractive(["nvim", `${process.env.HOME}/.config/nvim`]);
    });

  program
    .command("edit-zsh")
    .description("Edit zsh config")
    .action(async () => {
      await execInteractive(["nvim", `${process.env.HOME}/.config/zsh`]);
    });

  program
    .command("commit")
    .description("Generate a commit message using Claude Code")
    .action(async () => {
      const stagedFiles = await exec(["git", "diff", "--cached", "--name-only"]);
      if (!stagedFiles) {
        console.log("No staged changes found. Stage your changes with 'git add' first.");
        return;
      }

      const files = stagedFiles.split("\n").filter(Boolean);
      console.log("\n\x1b[1mStaged files:\x1b[0m");
      files.forEach((f) => console.log(`  • ${f}`));
      console.log();

      const packageJsonExists = await Bun.file("package.json").exists();

      if (packageJsonExists) {
        const packageJson = await Bun.file("package.json").json();
        const deps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies,
        };

        const hasPrettier = !!deps?.prettier;
        const hasEslint = !!deps?.eslint;

        const lintableExts = [".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"];
        const lintableFiles = files.filter((f) => lintableExts.some((ext) => f.endsWith(ext)));

        if (hasPrettier && files.length > 0) {
          console.log("\x1b[34m→\x1b[0m Running prettier on staged files...");
          const prettierResult = await Bun.spawn(["bunx", "prettier", "--write", ...files], {
            stdout: "inherit",
            stderr: "inherit",
          });
          await prettierResult.exited;

          const changed = await exec(["git", "diff", "--name-only", "--", ...files]);
          if (changed) {
            const changedFiles = changed.split("\n").filter(Boolean);
            console.log("\x1b[33m!\x1b[0m Prettier modified files, re-staging...");
            await exec(["git", "add", ...changedFiles]);
          }
        }

        if (hasEslint && lintableFiles.length > 0) {
          console.log("\x1b[34m→\x1b[0m Running eslint on staged files...");
          const eslintResult = await Bun.spawn(["bunx", "eslint", ...lintableFiles], {
            stdout: "inherit",
            stderr: "inherit",
          });
          await eslintResult.exited;

          if (eslintResult.exitCode !== 0) {
            const continueAnyway = await select<string>({
              message: "Lint failed. Continue anyway?",
              choices: [
                { name: "Yes", value: "yes" },
                { name: "No", value: "no" },
              ],
            });

            if (continueAnyway !== "yes") {
              console.log("Aborted.");
              return;
            }
          }
        }
      }

      // Filter out files that are never important for commit messages
      const ignoredPatterns = [
        ":(exclude)*.lock",
        ":(exclude)yarn.lock",
        ":(exclude)package-lock.json",
        ":(exclude)bun.lockb",
        ":(exclude)pnpm-lock.yaml",
        ":(exclude)composer.lock",
        ":(exclude)Gemfile.lock",
        ":(exclude)poetry.lock",
        ":(exclude)Cargo.lock",
        ":(exclude)*.min.js",
        ":(exclude)*.min.css",
        ":(exclude)dist/*",
        ":(exclude)build/*",
        ":(exclude)*.map",
        ":(exclude)*.bundle.js",
        ":(exclude)*.chunk.js",
      ];

      // Get diff excluding ignored files
      const diff = await exec(["git", "diff", "--cached", "--", ".", ...ignoredPatterns]);

      const maxChars = 50000; // ~12k tokens, safe for most models

      let prompt;
      if (diff.length > maxChars) {
        // Large commit: use statistics only
        const stats = await exec([
          "git",
          "diff",
          "--cached",
          "--stat",
          "--",
          ".",
          ...ignoredPatterns,
        ]);
        const summary = await exec([
          "git",
          "diff",
          "--cached",
          "--shortstat",
          "--",
          ".",
          ...ignoredPatterns,
        ]);

        prompt = `Based on these git statistics, write a concise commit message (1-2 sentences) using Git Conventions. Output ONLY the commit message, nothing else:

Summary: ${summary}

Files changed:
${stats}`;
      } else {
        // Normal commit: use full diff
        prompt = `Based on this git diff, write a concise commit message (1-2 sentences) using Git Conventions. Output ONLY the commit message, nothing else:

${diff}`;
      }

      const message = await withSpinner("Generating commit message...", () =>
        exec(["claude", "-p", prompt])
      );

      let finalMessage = message;

      while (true) {
        console.log(`\n\x1b[1mCommit message:\x1b[0m\n${finalMessage}\n`);

        const action = await select<string>({
          message: "What would you like to do?",
          choices: [
            { name: "Apply", value: "apply" },
            { name: "Edit", value: "edit" },
            { name: "Cancel", value: "cancel" },
          ],
        });

        if (action === "apply") {
          await execInteractive(["git", "commit", "-m", finalMessage]);

          const push = await select<string>({
            message: "Push to remote?",
            choices: [
              { name: "Yes", value: "yes" },
              { name: "No", value: "no" },
            ],
          });

          if (push === "yes") {
            await execInteractive(["git", "push"]);
          }
          break;
        } else if (action === "edit") {
          const tmpFile = `/tmp/commit-msg-${Date.now()}.txt`;
          await Bun.write(tmpFile, finalMessage);
          await execInteractive(["nvim", tmpFile]);
          finalMessage = (await Bun.file(tmpFile).text()).trim();
        } else {
          console.log("Cancelled.");
          break;
        }
      }
    });

  if (process.platform === "darwin") {
    program
      .command("unquarantine [app]")
      .description("Remove macOS quarantine from an application")
      .action(async (app?: string) => {
        let appPath = app;

        if (!appPath) {
          const entries = await readdir("/Applications");
          const apps = entries
            .filter((name) => name.endsWith(".app"))
            .sort((a, b) => a.localeCompare(b));

          if (apps.length === 0) {
            error("No .app files found in /Applications");
            return;
          }

          const selected = await search<string>({
            message: "Search for an application to unquarantine:",
            source: async (term) => {
              const filtered = term
                ? apps.filter((name) => name.toLowerCase().includes(term.toLowerCase()))
                : apps;
              return filtered.map((name) => ({ name, value: `/Applications/${name}` }));
            },
          });

          appPath = selected;
        }

        if (!appPath.endsWith(".app")) {
          appPath = `${appPath}.app`;
        }

        if (!appPath.startsWith("/")) {
          appPath = `/Applications/${appPath}`;
        }

        const file = Bun.file(appPath);
        const exists = await file.exists();

        if (!exists) {
          error(`Application not found: ${appPath}`);
          return;
        }

        info(`Removing quarantine from ${appPath}...`);
        await execInteractive(["xattr", "-dr", "com.apple.quarantine", appPath]);
        success(`Quarantine removed from ${appPath}`);
      });
  }
}
