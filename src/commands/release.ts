import { Command } from "commander";
import { select, input, confirm } from "@inquirer/prompts";
import { ExitPromptError } from "@inquirer/core";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { exec, execInteractive, withSpinner, commandExists } from "../utils/exec";
import { success, error, warn, info } from "../utils/icons";
import chalk from "chalk";
import { generateAIResponse } from "../utils/ai";
import { loadCommitlintConfig } from "../utils/commitlint";
import { loadConfig as loadHConfig } from "../utils/config";
import { generateReleaseNotes, getRelevantDiffs, updateChangelog } from "../utils/release-notes";

interface ReleaseConfig {
  release: {
    versionFile: string;
    preRelease: string[];
    postRelease: string[];
  };
}

const DEFAULT_HRC = {
  release: {
    versionFile: "package.json",
    preRelease: [
      "# Add your pre-release commands here",
      "# Example: npm run lint",
      "# Example: npm run test",
      "# Example: npm run build",
    ],
    postRelease: [
      "# Add your post-release commands here",
      "# Example: npm publish",
      "# Example: docker push",
    ],
  },
};

async function loadConfig(): Promise<ReleaseConfig | null> {
  const configPath = ".hrc";

  if (!existsSync(configPath)) {
    console.log(chalk.yellow("\n⚠ No .hrc file found in current directory\n"));

    const createDefault = await confirm({
      message: "Would you like to create a default .hrc file?",
      default: true,
    });

    if (createDefault) {
      try {
        writeFileSync(configPath, JSON.stringify(DEFAULT_HRC, null, 2) + "\n");
        success("Created .hrc file with default configuration");
        console.log(chalk.cyan("\nPlease edit .hrc to configure your release hooks:"));
        console.log(
          chalk.gray("  - preRelease: commands to run before commit (lint, test, build)")
        );
        console.log(chalk.gray("  - postRelease: commands to run after push (publish, deploy)\n"));

        const editNow = await confirm({
          message: "Open .hrc in editor now?",
          default: true,
        });

        if (editNow) {
          await execInteractive(["nvim", configPath]);
          console.log();
        }

        // Reload config after creation/editing
        const content = readFileSync(configPath, "utf-8");
        return JSON.parse(content);
      } catch (err) {
        error("Failed to create .hrc file");
        return null;
      }
    } else {
      info("Continuing without .hrc configuration");
      return null;
    }
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    error("Failed to parse .hrc file");
    return null;
  }
}

function getCurrentVersion(versionFile: string): string | null {
  if (!existsSync(versionFile)) {
    error(`Version file not found: ${versionFile}`);
    return null;
  }

  try {
    const content = readFileSync(versionFile, "utf-8");
    const pkg = JSON.parse(content);
    return pkg.version || null;
  } catch (err) {
    error(`Failed to read version from ${versionFile}`);
    return null;
  }
}

function incrementVersion(version: string, type: "major" | "minor" | "patch"): string {
  const parts = version.split(".").map(Number);

  switch (type) {
    case "major":
      parts[0]++;
      parts[1] = 0;
      parts[2] = 0;
      break;
    case "minor":
      parts[1]++;
      parts[2] = 0;
      break;
    case "patch":
      parts[2]++;
      break;
  }

  return parts.join(".");
}

function updateVersionInFile(versionFile: string, newVersion: string): boolean {
  try {
    const content = readFileSync(versionFile, "utf-8");
    const pkg = JSON.parse(content);
    pkg.version = newVersion;
    writeFileSync(versionFile, JSON.stringify(pkg, null, 2) + "\n");
    return true;
  } catch (err) {
    error(`Failed to update version in ${versionFile}`);
    return false;
  }
}

function filterHooks(hooks: string[]): string[] {
  return hooks.filter((hook) => !hook.trim().startsWith("#") && hook.trim().length > 0);
}

async function getCurrentBranch(): Promise<string | null> {
  try {
    const branch = await exec(["git", "rev-parse", "--abbrev-ref", "HEAD"]);
    return branch || null;
  } catch (err) {
    error("Failed to detect current git branch");
    return null;
  }
}

async function runHook(command: string, description: string): Promise<boolean> {
  // Skip comments and empty lines
  if (command.trim().startsWith("#") || command.trim().length === 0) {
    return true;
  }

  try {
    info(`Running: ${command}`);
    // Split command into program and args
    const parts = command.split(" ");
    await execInteractive(parts);
    success(`${description} completed`);
    return true;
  } catch (err) {
    error(`${description} failed`);
    return false;
  }
}

async function getCommitMessage(
  newVersion: string,
  useAI: boolean,
  debug: boolean = false
): Promise<string> {
  if (useAI) {
    try {
      const hConfig = loadHConfig();
      const providerName = hConfig.ai.provider === "claude" ? "Claude" : "Ollama";
      info(`Generating commit message with ${providerName}...`);

      // Get the latest tag
      let lastTag = "";
      try {
        lastTag = await exec(["git", "describe", "--tags", "--abbrev=0"]);
      } catch (err) {
        // No tags found, get all commits
      }

      // Get commit history since last tag
      const commitRange = lastTag ? `${lastTag}..HEAD` : "HEAD";
      const commitLog = await exec(["git", "log", commitRange, "--oneline"]);

      if (!commitLog) {
        warn("No commits found since last tag");
        return await input({
          message: "Enter commit message:",
          default: `chore: release v${newVersion}`,
        });
      }

      // Get file statistics since last tag
      const fileStats = await exec(["git", "diff", "--stat", lastTag ? lastTag : "HEAD~1", "HEAD"]);

      // Get current staged diff for context (if any)
      const stagedDiff = await exec(["git", "diff", "--staged", "--shortstat"]);

      // Load commitlint config if available
      const commitlintConfig = await loadCommitlintConfig();
      const commitlintInstructions = commitlintConfig
        ? `\n\nIMPORTANT - Follow this commitlint configuration:\n${commitlintConfig}`
        : "";

      // Use AI to generate commit message
      const prompt = `Generate a concise release commit message for version ${newVersion}.

Base your message on the following commit history${lastTag ? ` since ${lastTag}` : ""}:

Commits:
${commitLog}

Files changed:
${fileStats}

${stagedDiff ? `Current staged changes: ${stagedDiff}` : ""}

Provide only the commit message, following conventional commits format (e.g., "chore: release v${newVersion}" or "feat: release v${newVersion} with new features").
Summarize the main changes and improvements in 1-2 sentences.${commitlintInstructions}`;

      // Show prompt in debug mode
      if (debug) {
        console.log("\n\x1b[1m🐛 Debug - AI Prompt:\x1b[0m");
        console.log("\x1b[90m" + "=".repeat(80) + "\x1b[0m");
        console.log(prompt);
        console.log("\x1b[90m" + "=".repeat(80) + "\x1b[0m\n");
      }

      const message = await generateAIResponse(prompt);

      if (message) {
        success("AI-generated commit message");
        console.log(`\n${message}\n`);

        const useGenerated = await confirm({
          message: "Use this commit message?",
          default: true,
        });

        if (useGenerated) {
          return message;
        }
      }
    } catch (err) {
      warn("Failed to generate AI commit message, falling back to manual input");
    }
  }

  return await input({
    message: "Enter commit message:",
    default: `chore: release v${newVersion}`,
  });
}

export function registerReleaseCommands(program: Command): void {
  program
    .command("release")
    .description("Release a new version (with pre/post hooks from .hrc)")
    .option("--debug", "Show AI prompt for debugging")
    .action(async (options) => {
      let versionFile = "package.json";
      let originalVersion: string | null = null;
      let versionWasChanged = false;

      // Graceful shutdown handler
      const cleanup = () => {
        if (versionWasChanged && originalVersion && versionFile) {
          console.log();
          warn("\n⚠ Release cancelled - reverting version changes...");
          updateVersionInFile(versionFile, originalVersion);
          info(`Version reverted to ${originalVersion}`);
        }
        console.log();
        process.exit(0);
      };

      // Catch Ctrl+C and other exit signals
      process.on("SIGINT", cleanup);
      process.on("SIGTERM", cleanup);

      try {
        console.log("\n🚀 Release Process\n");

        // Detect current branch
        const currentBranch = await getCurrentBranch();
        if (!currentBranch) {
          error("Could not detect current git branch");
          return;
        }

        // Load config
        const config = await loadConfig();
        if (!config) {
          info("Using default configuration (package.json)");
        }

        versionFile = config?.release.versionFile || "package.json";
        const preReleaseHooks = config?.release.preRelease || [];
        const postReleaseHooks = config?.release.postRelease || [];

        // Get current version
        const currentVersion = getCurrentVersion(versionFile);
        if (!currentVersion) {
          return;
        }

        originalVersion = currentVersion;

        console.log(`Current version: ${currentVersion}\n`);

        // Ask which part to increment
        const versionType = await select({
          message: "Which version to increment?",
          choices: [
            {
              name: `Patch (${incrementVersion(currentVersion, "patch")}) - Bug fixes`,
              value: "patch",
            },
            {
              name: `Minor (${incrementVersion(currentVersion, "minor")}) - New features`,
              value: "minor",
            },
            {
              name: `Major (${incrementVersion(currentVersion, "major")}) - Breaking changes`,
              value: "major",
            },
            {
              name: `Skip (${currentVersion}) - Version already updated manually`,
              value: "skip",
            },
          ],
        });

        if (!versionType) return;

        let newVersion = currentVersion;

        if (versionType !== "skip") {
          newVersion = incrementVersion(currentVersion, versionType as "major" | "minor" | "patch");
          console.log(`\n→ New version will be: ${newVersion}\n`);

          // Update version first (needed for pre-release hooks that might build)
          info(`Updating version in ${versionFile}...`);
          if (!updateVersionInFile(versionFile, newVersion)) {
            return;
          }
          versionWasChanged = true; // Mark that version was changed
          success(`Version updated to ${newVersion}`);
        } else {
          console.log(`\n→ Keeping current version: ${currentVersion}\n`);
          info("Skipping version update - using current version");
        }

        // Run pre-release hooks (lint, format, build, etc)
        if (preReleaseHooks.length > 0) {
          console.log("\n📋 Running pre-release hooks:\n");
          for (const hook of preReleaseHooks) {
            if (!(await runHook(hook, hook))) {
              error("\nPre-release hook failed. Aborting release.");
              // Revert version change
              updateVersionInFile(versionFile, currentVersion);
              warn("Version reverted to " + currentVersion);
              return;
            }
          }
          console.log();
        }

        // Check if there are changes to stage
        const stagedChanges = await exec(["git", "diff", "--cached", "--name-only"]);
        const unstagedChanges = await exec(["git", "diff", "--name-only"]);

        if (!stagedChanges && !unstagedChanges) {
          error("No changes to release");
          return;
        }

        // If there are unstaged changes, ask if user wants to stage them
        if (unstagedChanges) {
          const shouldStageAll = await confirm({
            message: "There are unstaged changes. Stage all changes for release?",
            default: true,
          });

          if (!shouldStageAll) {
            info("Release cancelled. Stage your changes manually first.");
            return;
          }

          // Stage changes (needed for AI analysis)
          try {
            await withSpinner("Staging changes for commit", async () => {
              await exec(["git", "add", "."]);
            });
            success("Changes staged");
          } catch (err) {
            error("Failed to stage changes");
            console.error(err);
            return;
          }
        } else if (stagedChanges) {
          info("Using already staged changes");
        }

        // Ask for commit message
        const hConfig = loadHConfig();
        const providerName = hConfig.ai.provider === "claude" ? "Claude" : "Ollama";
        const useAI = await confirm({
          message: `Use AI (${providerName}) to generate commit message?`,
          default: false,
        });

        const commitMessage = await getCommitMessage(newVersion, useAI, options.debug);

        // Confirm before proceeding
        const activePreHooks = filterHooks(preReleaseHooks);
        const activePostHooks = filterHooks(postReleaseHooks);

        console.log("\n📋 Release Summary:");
        console.log(`  Version: ${currentVersion} → ${newVersion}`);
        console.log(`  Branch: ${currentBranch}`);
        console.log(`  Commit: ${commitMessage}`);
        if (activePreHooks.length > 0) {
          console.log(`  Pre-release hooks: ${activePreHooks.length} completed`);
        }
        if (activePostHooks.length > 0) {
          console.log(`  Post-release hooks: ${activePostHooks.length} to run`);
        }

        const confirmed = await confirm({
          message: "\nProceed with release?",
          default: true,
        });

        if (!confirmed) {
          warn("\nRelease cancelled");
          // Revert version change
          updateVersionInFile(versionFile, currentVersion);
          warn("Version reverted to " + currentVersion);
          return;
        }

        console.log("\n🔧 Starting release process...\n");

        // Git operations
        try {
          // Step 1: Create commit (WITHOUT tag yet)
          await withSpinner("Creating commit", async () => {
            await exec(["git", "commit", "-m", commitMessage]);
          });
          success(`Commit created: ${commitMessage}`);

          // Step 2: Ask about release notes
          const generateNotes = await confirm({
            message: "Generate detailed release notes?",
            default: true,
          });

          let releaseNotesContent = "";

          if (generateNotes) {
            console.log();
            const hConfig = loadHConfig();
            const providerName = hConfig.ai.provider === "claude" ? "Claude" : "Ollama";

            // Get the last tag for comparison
            let lastTag = "";
            try {
              lastTag = await exec(["git", "describe", "--tags", "--abbrev=0", "HEAD~1"]);
            } catch (err) {
              // No previous tag, use first commit
              lastTag = await exec(["git", "rev-list", "--max-parents=0", "HEAD"]);
            }

            // Get commit history
            const commitRange = lastTag ? `${lastTag}..HEAD` : "HEAD";
            const commitLog = await exec(["git", "log", commitRange, "--oneline"]);

            // Get file stats
            const fileStats = await exec([
              "git",
              "diff",
              "--stat",
              lastTag ? lastTag : "HEAD~1",
              "HEAD",
            ]);

            // Get relevant diffs
            const diffs = await getRelevantDiffs(lastTag || "HEAD~1", "HEAD");

            // Generate release notes with AI
            releaseNotesContent = await withSpinner(
              `Generating release notes with ${providerName}...`,
              () => generateReleaseNotes(newVersion, lastTag, commitLog, diffs, fileStats)
            );

            // Preview release notes
            console.log("\n" + chalk.bold("📝 Generated Release Notes:"));
            console.log(chalk.gray("─".repeat(80)));
            console.log(releaseNotesContent);
            console.log(chalk.gray("─".repeat(80)) + "\n");

            const useNotes = await confirm({
              message: "Add these release notes to CHANGELOG.md?",
              default: true,
            });

            if (useNotes) {
              // Read existing CHANGELOG if it exists
              const changelogPath = "CHANGELOG.md";
              let existingChangelog = "";
              if (existsSync(changelogPath)) {
                existingChangelog = readFileSync(changelogPath, "utf-8");
              }

              // Update CHANGELOG
              const updatedChangelog = updateChangelog(
                newVersion,
                releaseNotesContent,
                existingChangelog
              );
              writeFileSync(changelogPath, updatedChangelog);
              success("CHANGELOG.md updated");

              // Stage and amend commit
              await exec(["git", "add", "CHANGELOG.md"]);
              await exec(["git", "commit", "--amend", "--no-edit"]);
              success("Commit amended with CHANGELOG.md");
            }
          }

          // Step 3: NOW create the tag (after changelog is included)
          await withSpinner(`Creating tag v${newVersion}`, async () => {
            await exec(["git", "tag", `v${newVersion}`]);
          });
          success(`Tag created: v${newVersion}`);

          // Step 4: Push everything
          await withSpinner(`Pushing to remote (${currentBranch})`, async () => {
            await exec(["git", "push", "origin", currentBranch]);
          });
          success(`Pushed to ${currentBranch}`);

          await withSpinner(`Pushing tag v${newVersion}`, async () => {
            await exec(["git", "push", "origin", `v${newVersion}`]);
          });
          success(`Tag pushed: v${newVersion}`);

          // Step 5: Create GitHub Release if gh CLI is available
          if (releaseNotesContent && (await commandExists("gh"))) {
            console.log();
            const createGHRelease = await confirm({
              message: "Create GitHub Release?",
              default: true,
            });

            if (createGHRelease) {
              try {
                await withSpinner("Creating GitHub Release", async () => {
                  // Create a temporary file with release notes
                  const tmpFile = `/tmp/release-notes-${newVersion}.md`;
                  writeFileSync(tmpFile, releaseNotesContent);

                  await exec([
                    "gh",
                    "release",
                    "create",
                    `v${newVersion}`,
                    "--title",
                    `Release v${newVersion}`,
                    "--notes-file",
                    tmpFile,
                  ]);
                });
                success(`GitHub Release created: v${newVersion}`);
              } catch (err) {
                warn("Failed to create GitHub Release (you can do it manually later)");
              }
            }
          }
        } catch (err) {
          error("Git operations failed");
          console.error(err);
          return;
        }

        // Run post-release hooks
        if (postReleaseHooks.length > 0) {
          console.log("\n📋 Running post-release hooks:\n");
          for (const hook of postReleaseHooks) {
            await runHook(hook, hook);
          }
        }

        success(`\nRelease v${newVersion} completed successfully! 🎉\n`);

        // Release completed successfully - version change is permanent
        versionWasChanged = false;
      } catch (err: any) {
        // Handle user cancellation (Ctrl+C or ESC)
        if (err instanceof ExitPromptError) {
          cleanup();
          return;
        }

        // Other errors
        console.log();
        error("Release failed with error:");
        console.error(err);

        // Revert version if it was changed
        if (versionWasChanged && originalVersion) {
          console.log();
          warn("Reverting version changes...");
          updateVersionInFile(versionFile, originalVersion);
          info(`Version reverted to ${originalVersion}`);
        }
      } finally {
        // Remove signal handlers
        process.off("SIGINT", cleanup);
        process.off("SIGTERM", cleanup);
      }
    });
}
