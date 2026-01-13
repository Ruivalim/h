import { existsSync, readFileSync } from "fs";
import { loadConfig, updateConfig } from "./config";
import { exec } from "./exec";
import chalk from "chalk";

const H_VERSION_FILE = `${process.env.HOME}/.local/bin/.h_version`;
const H_REPO = "Ruivalim/h";
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Check if an update check should be performed
 */
function shouldCheckForUpdate(): boolean {
  const config = loadConfig();

  // Don't check if disabled in config
  if (!config.updates.checkOnStartup) {
    return false;
  }

  // Check if we've checked recently (within last 24 hours)
  if (config.updates.lastChecked) {
    const lastChecked = new Date(config.updates.lastChecked).getTime();
    const now = Date.now();
    const timeSinceLastCheck = now - lastChecked;

    if (timeSinceLastCheck < CHECK_INTERVAL_MS) {
      return false;
    }
  }

  return true;
}

/**
 * Check for CLI updates and notify the user if a new version is available
 * Runs silently in the background and doesn't block CLI execution
 */
export async function checkForUpdates(): Promise<void> {
  try {
    if (!shouldCheckForUpdate()) {
      return;
    }

    // Update last checked timestamp
    updateConfig({
      updates: {
        checkOnStartup: true,
        lastChecked: new Date().toISOString(),
      },
    });

    // Get current version
    const currentVersion = existsSync(H_VERSION_FILE)
      ? readFileSync(H_VERSION_FILE, "utf-8").trim()
      : "unknown";

    // Get latest version from GitHub (with timeout)
    try {
      // Note: exec() here uses Bun.spawn with array args - completely safe
      const latestResponse = await exec([
        "curl",
        "-s",
        "--max-time",
        "3",
        `https://api.github.com/repos/${H_REPO}/releases/latest`,
      ]);

      const latest = JSON.parse(latestResponse);
      const latestVersion = latest.tag_name;

      if (!latestVersion) {
        return;
      }

      // Compare versions
      if (currentVersion !== latestVersion && currentVersion !== "unknown") {
        // Show update notification
        const paddingNeeded = Math.max(0, 20 - currentVersion.length - latestVersion.length);
        console.log(chalk.yellow(`\n┌─────────────────────────────────────────────────────┐`));
        console.log(
          chalk.yellow(
            `│  Update available: ${chalk.cyan(currentVersion)} → ${chalk.green(latestVersion)}${" ".repeat(paddingNeeded)}│`
          )
        );
        console.log(chalk.yellow(`│  Run ${chalk.bold("h upgrade")} to update${" ".repeat(25)}│`));
        console.log(chalk.yellow(`└─────────────────────────────────────────────────────┘\n`));
      }
    } catch (err) {
      // Silently fail - don't interrupt user experience
    }
  } catch (err) {
    // Silently fail - update check is not critical
  }
}
