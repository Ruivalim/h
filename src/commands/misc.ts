import { Command } from "commander";
import { exec, execInteractive, withSpinner, getPlatform } from "../utils/exec";
import { info, success, error, warn } from "../utils/icons";
import { select, search } from "../utils/prompt";
import { readdir } from "node:fs/promises";
import { existsSync, readFileSync, writeFileSync, chmodSync } from "fs";
import { confirm } from "@inquirer/prompts";

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
    .command("ip")
    .description("Show your public IP address and info")
    .action(async () => {
      try {
        console.log();

        // Get IPv4
        const ipv4Promise = exec(["curl", "-s", "-4", "api.ipify.org"]).catch(() => "N/A");

        // Get IPv6
        const ipv6Promise = exec(["curl", "-s", "-6", "api64.ipify.org"]).catch(() => "N/A");

        // Get detailed info
        const infoPromise = exec(["curl", "-s", "ipinfo.io"]).catch(() => null);

        const [ipv4, ipv6, infoRaw] = await Promise.all([ipv4Promise, ipv6Promise, infoPromise]);

        console.log("\x1b[1m📡 Public IP Information\x1b[0m\n");

        console.log(`\x1b[34mIPv4:\x1b[0m ${ipv4}`);
        console.log(`\x1b[34mIPv6:\x1b[0m ${ipv6}`);

        if (infoRaw) {
          const info = JSON.parse(infoRaw);
          console.log();
          console.log(
            `\x1b[34mLocation:\x1b[0m ${info.city || "N/A"}, ${info.region || "N/A"}, ${info.country || "N/A"}`
          );
          console.log(`\x1b[34mOrg:\x1b[0m ${info.org || "N/A"}`);
          console.log(`\x1b[34mTimezone:\x1b[0m ${info.timezone || "N/A"}`);
        }

        console.log();
      } catch (err) {
        error("Failed to fetch IP information");
        console.error(err);
      }
    });

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

  program
    .command("branch-diff")
    .description("Generate a diff report between two branches using Claude")
    .action(async () => {
      // Get all branches (local and remote)
      const branchOutput = await exec(["git", "branch", "-a", "--format=%(refname:short)"]);
      if (!branchOutput) {
        error("No branches found. Are you in a git repository?");
        return;
      }

      const branches = branchOutput
        .split("\n")
        .filter(Boolean)
        .filter((b) => !b.includes("HEAD"))
        .map((b) => b.replace("origin/", ""))
        .filter((value, index, self) => self.indexOf(value) === index) // Remove duplicates
        .sort();

      if (branches.length < 2) {
        error("Need at least 2 branches to compare.");
        return;
      }

      // Get current branch as default
      const currentBranch = (await exec(["git", "branch", "--show-current"])).trim();

      console.log("\n\x1b[1mSelect branches to compare:\x1b[0m\n");

      // Select source branch (base)
      const sourceBranch = await search<string>({
        message: "Source branch (base):",
        source: async (term) => {
          const filtered = term
            ? branches.filter((b) => b.toLowerCase().includes(term.toLowerCase()))
            : branches;
          return filtered.map((b) => ({
            name: b === currentBranch ? `${b} (current)` : b,
            value: b,
          }));
        },
      });

      if (!sourceBranch) {
        console.log("Cancelled.");
        return;
      }

      // Filter out selected source branch for target selection
      const targetBranches = branches.filter((b) => b !== sourceBranch);

      // Select target branch (compare)
      const targetBranch = await search<string>({
        message: "Target branch (compare):",
        source: async (term) => {
          const filtered = term
            ? targetBranches.filter((b) => b.toLowerCase().includes(term.toLowerCase()))
            : targetBranches;
          return filtered.map((b) => ({
            name: b === currentBranch ? `${b} (current)` : b,
            value: b,
          }));
        },
      });

      if (!targetBranch) {
        console.log("Cancelled.");
        return;
      }

      console.log(
        `\n\x1b[34m→\x1b[0m Comparing \x1b[33m${sourceBranch}\x1b[0m → \x1b[33m${targetBranch}\x1b[0m\n`
      );

      // Get commit log between branches
      const commits = await exec(["git", "log", "--oneline", `${sourceBranch}..${targetBranch}`]);

      // Get diff statistics
      const stats = await exec(["git", "diff", "--stat", `${sourceBranch}...${targetBranch}`]);

      const shortstat = await exec([
        "git",
        "diff",
        "--shortstat",
        `${sourceBranch}...${targetBranch}`,
      ]);

      if (!commits && !stats) {
        info("No differences found between the branches.");
        return;
      }

      // Get the actual diff (limited for large diffs)
      const diff = await exec([
        "git",
        "diff",
        `${sourceBranch}...${targetBranch}`,
        "--",
        ".",
        ":(exclude)*.lock",
        ":(exclude)yarn.lock",
        ":(exclude)package-lock.json",
        ":(exclude)bun.lockb",
        ":(exclude)pnpm-lock.yaml",
        ":(exclude)*.min.js",
        ":(exclude)*.min.css",
        ":(exclude)dist/*",
        ":(exclude)build/*",
        ":(exclude)*.map",
      ]);

      const maxChars = 50000;
      const diffContent = diff.length > maxChars ? stats : diff;
      const isLargeDiff = diff.length > maxChars;

      const prompt = `Analyze the following git diff between branch "${sourceBranch}" and "${targetBranch}" and generate a comprehensive report in Portuguese (Brazil).

${isLargeDiff ? "Note: The diff was too large, showing statistics only." : ""}

**Commits in ${targetBranch} not in ${sourceBranch}:**
${commits || "No commits found"}

**Summary:**
${shortstat || "No changes"}

**${isLargeDiff ? "Files changed" : "Full diff"}:**
${diffContent || "No differences"}

Generate a report with:
1. **Resumo Geral**: A brief overview of what changed
2. **Principais Mudanças**: List the most important changes grouped by category (features, fixes, refactoring, etc.)
3. **Arquivos Impactados**: Key files that were modified and why
4. **Pontos de Atenção**: Any potential issues, breaking changes, or things to review carefully
5. **Recomendações**: Suggestions for code review or testing

Format the output in Markdown.`;

      const report = await withSpinner("Generating diff report with Claude...", () =>
        exec(["claude", "-p", prompt])
      );

      console.log(
        "\n\x1b[1m═══════════════════════════════════════════════════════════════\x1b[0m"
      );
      console.log("\x1b[1m                      BRANCH DIFF REPORT\x1b[0m");
      console.log(`\x1b[1m                   ${sourceBranch} → ${targetBranch}\x1b[0m`);
      console.log(
        "\x1b[1m═══════════════════════════════════════════════════════════════\x1b[0m\n"
      );
      console.log(report);

      // Option to save the report
      const action = await select<string>({
        message: "What would you like to do?",
        choices: [
          { name: "Done", value: "done" },
          { name: "Save to file", value: "save" },
          { name: "Copy to clipboard", value: "copy" },
        ],
      });

      if (action === "save") {
        const timestamp = Date.now();
        const filename = `branch-diff-${sourceBranch.replace(/\//g, "-")}-${targetBranch.replace(/\//g, "-")}-${timestamp}.md`;
        await Bun.write(filename, report);
        success(`Report saved to ${filename}`);
      } else if (action === "copy") {
        if (process.platform === "darwin") {
          const proc = Bun.spawn(["pbcopy"], { stdin: "pipe" });
          proc.stdin.write(report);
          proc.stdin.end();
          await proc.exited;
          success("Report copied to clipboard!");
        } else {
          error("Clipboard copy is only supported on macOS currently.");
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

  program
    .command("upgrade")
    .alias("update")
    .description("Upgrade h CLI to the latest version")
    .action(async () => {
      const H_BIN = `${process.env.HOME}/.local/bin/h`;
      const H_VERSION_FILE = `${process.env.HOME}/.local/bin/.h_version`;
      const H_REPO = "Ruivalim/h";

      // Detect platform
      const platform = getPlatform();
      let artifact = "";

      if (platform === "darwin") {
        artifact = "h-darwin-arm64";
      } else if (platform === "linux") {
        artifact = "h-linux-x64";
      } else {
        error(`Unsupported platform: ${platform}`);
        return;
      }

      try {
        // Get current version
        const currentVersion = existsSync(H_VERSION_FILE)
          ? readFileSync(H_VERSION_FILE, "utf-8").trim()
          : "unknown";

        info(`Current version: ${currentVersion}`);

        // Get latest version from GitHub
        const latestResponse = await withSpinner("Checking for updates...", () =>
          exec(["curl", "-s", `https://api.github.com/repos/${H_REPO}/releases/latest`])
        );

        const latest = JSON.parse(latestResponse);
        const latestVersion = latest.tag_name;

        if (!latestVersion) {
          error("Could not fetch latest version from GitHub");
          return;
        }

        info(`Latest version: ${latestVersion}`);

        if (currentVersion === latestVersion) {
          success("h CLI is already up to date!");
          return;
        }

        console.log(`\nUpdate available: ${currentVersion} → ${latestVersion}\n`);

        const confirmed = await confirm({
          message: "Would you like to upgrade?",
          default: true,
        });

        if (!confirmed) {
          info("Upgrade cancelled");
          return;
        }

        // Download and install new version
        const downloadUrl = `https://github.com/${H_REPO}/releases/download/${latestVersion}/${artifact}`;

        await withSpinner(`Downloading ${latestVersion}...`, async () => {
          await exec(["curl", "-fsSL", downloadUrl, "-o", H_BIN]);
        });

        chmodSync(H_BIN, 0o755);
        writeFileSync(H_VERSION_FILE, latestVersion);

        success(`✓ h CLI upgraded to ${latestVersion}!`);
        info("\nRun 'h --version' to verify the new version");
      } catch (err) {
        error("Failed to upgrade h CLI");
        console.error(err);
      }
    });

  program
    .command("uninstall")
    .description("Uninstall h CLI from your system")
    .action(async () => {
      const H_BIN = `${process.env.HOME}/.local/bin/h`;
      const H_VERSION_FILE = `${process.env.HOME}/.local/bin/.h_version`;

      console.log("\n⚠️  This will remove h CLI from your system\n");

      const confirmed = await confirm({
        message: "Are you sure you want to uninstall h CLI?",
        default: false,
      });

      if (!confirmed) {
        info("Uninstall cancelled");
        return;
      }

      try {
        let removed = false;

        if (existsSync(H_BIN)) {
          await exec(["rm", H_BIN]);
          success("Removed binary: ~/.local/bin/h");
          removed = true;
        }

        if (existsSync(H_VERSION_FILE)) {
          await exec(["rm", H_VERSION_FILE]);
          success("Removed version file: ~/.local/bin/.h_version");
          removed = true;
        }

        if (removed) {
          console.log();
          success("h CLI has been uninstalled successfully!");
          console.log();
          warn("Note: The zsh function wrapper is still in ~/.config/zsh/functions.zsh");
          info("It will auto-install h CLI again if you run 'h' command");
          info("To remove it permanently, edit ~/.config/zsh/functions.zsh");
        } else {
          info("h CLI is not installed (no files found)");
        }
      } catch (err) {
        error("Failed to uninstall h CLI");
        console.error(err);
      }
    });
}
