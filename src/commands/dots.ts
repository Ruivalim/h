import { Command } from "commander";
import { checkbox, confirm, select } from "@inquirer/prompts";
import { loadConfig, saveConfig, type HConfig } from "../utils/config";
import { success, error, info, warn } from "../utils/icons";
import { existsSync, statSync, readdirSync, mkdirSync, chmodSync } from "fs";
import { join, relative, dirname, basename } from "path";
import chalk from "chalk";

// Helper to expand ~ in paths
function expandPath(path: string): string {
  if (path.startsWith("~")) {
    return join(process.env.HOME || "", path.slice(1));
  }
  return path;
}

// Get dots configuration with defaults
function getDotsConfig(): NonNullable<HConfig["dots"]> {
  const config = loadConfig();
  return (
    config.dots || {
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
    }
  );
}

// Git commit and push helper
interface GitCommitOptions {
  action: "add" | "sync" | "remove";
  files: string[];
  updatedFiles?: string[];
  removedFiles?: string[];
}

async function gitCommitAndPush(sourceDir: string, options: GitCommitOptions): Promise<void> {
  const dotsConfig = getDotsConfig();
  if (!dotsConfig.autoPush) return;

  const expandedSourceDir = expandPath(sourceDir);

  // Check if it's a git repo
  if (!existsSync(join(expandedSourceDir, ".git"))) {
    warn("Source directory is not a git repository, skipping auto-push");
    return;
  }

  // Build commit message
  let commitMessage = "";

  if (options.action === "add") {
    if (options.files.length === 1) {
      commitMessage = `dots: add ${options.files[0]}`;
    } else {
      commitMessage = `dots: add ${options.files.length} files\n\nAdded:\n${options.files.map((f) => `- ${f}`).join("\n")}`;
    }
  } else if (options.action === "remove") {
    commitMessage = `dots: remove ${options.files[0]}`;
  } else if (options.action === "sync") {
    const parts: string[] = ["dots: sync"];
    const body: string[] = [];

    if (options.updatedFiles && options.updatedFiles.length > 0) {
      body.push("\nUpdated:");
      body.push(...options.updatedFiles.map((f) => `- ${f}`));
    }

    if (options.removedFiles && options.removedFiles.length > 0) {
      body.push("\nRemoved:");
      body.push(...options.removedFiles.map((f) => `- ${f}`));
    }

    if (body.length > 0) {
      commitMessage = parts[0] + "\n" + body.join("\n");
    } else {
      return; // Nothing to commit
    }
  }

  try {
    // Run git commands
    const proc = Bun.spawn(["git", "add", "-A"], { cwd: expandedSourceDir });
    await proc.exited;

    const commitProc = Bun.spawn(["git", "commit", "-m", commitMessage], {
      cwd: expandedSourceDir,
      stdout: "pipe",
      stderr: "pipe",
    });
    await commitProc.exited;

    const pushProc = Bun.spawn(["git", "push"], {
      cwd: expandedSourceDir,
      stdout: "pipe",
      stderr: "pipe",
    });
    const pushExitCode = await pushProc.exited;

    if (pushExitCode === 0) {
      success("Changes committed and pushed");
    } else {
      warn("Committed but failed to push (check your remote)");
    }
  } catch (err) {
    warn(`Git operation failed: ${err}`);
  }
}

// Convert target path to source name (chezmoi format)
// .zshrc -> dot_zshrc
// .config/nvim -> dot_config/nvim
function toSourceName(targetPath: string, isPrivate = false, isExecutable = false): string {
  const parts = targetPath.split("/");
  const convertedParts = parts.map((part, index) => {
    if (part.startsWith(".")) {
      return "dot_" + part.slice(1);
    }
    return part;
  });

  let result = convertedParts.join("/");

  // Add prefixes for private/executable files (only to the final filename)
  if (isPrivate || isExecutable) {
    const dir = dirname(result);
    let filename = basename(result);

    if (isPrivate) {
      filename = "private_" + filename;
    }
    if (isExecutable) {
      filename = "executable_" + filename;
    }

    result = dir === "." ? filename : join(dir, filename);
  }

  return result;
}

// Convert source name to target path
// dot_zshrc -> .zshrc
// private_dot_ssh/config -> .ssh/config
// executable_script.sh -> script.sh
function toTargetName(sourcePath: string): string {
  const parts = sourcePath.split("/");
  const convertedParts = parts.map((part) => {
    // Remove prefixes
    let processed = part;
    processed = processed.replace(/^private_/, "");
    processed = processed.replace(/^executable_/, "");

    // Convert dot_ to .
    if (processed.startsWith("dot_")) {
      processed = "." + processed.slice(4);
    }

    return processed;
  });

  return convertedParts.join("/");
}

// Check if source name has private_ prefix
function isPrivateSource(sourcePath: string): boolean {
  const filename = basename(sourcePath);
  return (
    filename.startsWith("private_") || sourcePath.split("/").some((p) => p.startsWith("private_"))
  );
}

// Check if source name has executable_ prefix
function isExecutableSource(sourcePath: string): boolean {
  const filename = basename(sourcePath);
  return filename.startsWith("executable_");
}

// Get file mode based on source name prefixes
function getFileMode(sourceName: string): number {
  if (isPrivateSource(sourceName)) {
    return 0o600;
  }
  if (isExecutableSource(sourceName)) {
    return 0o755;
  }
  return 0o644;
}

// Check if a path should be ignored
function shouldIgnore(path: string, patterns: string[]): boolean {
  const filename = basename(path);

  for (const pattern of patterns) {
    // Simple glob matching
    if (pattern.startsWith("*")) {
      // *.ext pattern
      const ext = pattern.slice(1);
      if (filename.endsWith(ext)) return true;
    } else if (pattern.endsWith("*")) {
      // prefix* pattern
      const prefix = pattern.slice(0, -1);
      if (filename.startsWith(prefix)) return true;
    } else {
      // Exact match
      if (filename === pattern || path.includes(`/${pattern}/`) || path.endsWith(`/${pattern}`)) {
        return true;
      }
    }
  }

  return false;
}

// Recursively list all files in a directory
function listFilesRecursively(dir: string, baseDir: string = dir): string[] {
  const files: string[] = [];

  if (!existsSync(dir)) return files;

  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const relativePath = relative(baseDir, fullPath);

    if (entry.isDirectory()) {
      files.push(...listFilesRecursively(fullPath, baseDir));
    } else {
      files.push(relativePath);
    }
  }

  return files;
}

// Read file content using Bun
async function readFile(path: string): Promise<string> {
  const file = Bun.file(path);
  return await file.text();
}

// Write file using Bun
async function writeFile(path: string, content: string): Promise<void> {
  await Bun.write(path, content);
}

// Copy file preserving content
async function copyFile(src: string, dest: string): Promise<void> {
  const content = await readFile(src);
  const destDir = dirname(dest);

  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true });
  }

  await writeFile(dest, content);
}

// Compare two files
async function filesAreDifferent(file1: string, file2: string): Promise<boolean> {
  if (!existsSync(file1) || !existsSync(file2)) return true;

  try {
    const content1 = await readFile(file1);
    const content2 = await readFile(file2);
    return content1 !== content2;
  } catch {
    return true;
  }
}

// Generate simple diff between two strings
function generateDiff(
  original: string,
  modified: string,
  originalLabel: string,
  modifiedLabel: string
): string {
  const originalLines = original.split("\n");
  const modifiedLines = modified.split("\n");

  const output: string[] = [];
  output.push(chalk.cyan(`--- ${originalLabel}`));
  output.push(chalk.cyan(`+++ ${modifiedLabel}`));

  const maxLines = Math.max(originalLines.length, modifiedLines.length);

  for (let i = 0; i < maxLines; i++) {
    const origLine = originalLines[i];
    const modLine = modifiedLines[i];

    if (origLine === undefined) {
      output.push(chalk.green(`+ ${modLine}`));
    } else if (modLine === undefined) {
      output.push(chalk.red(`- ${origLine}`));
    } else if (origLine !== modLine) {
      output.push(chalk.red(`- ${origLine}`));
      output.push(chalk.green(`+ ${modLine}`));
    }
  }

  return output.join("\n");
}

// ============== Commands ==============

async function dotsAdd(targetPath: string): Promise<void> {
  const dotsConfig = getDotsConfig();
  const sourceDir = expandPath(dotsConfig.sourceDir);
  const targetDir = expandPath(dotsConfig.targetDir);
  const expandedTarget = expandPath(targetPath);

  // Make path relative to targetDir
  let relativeTarget = targetPath;
  if (expandedTarget.startsWith(targetDir)) {
    relativeTarget = relative(targetDir, expandedTarget);
  } else if (expandedTarget.startsWith(process.env.HOME || "")) {
    relativeTarget = relative(process.env.HOME || "", expandedTarget);
  }

  // Check if path exists
  if (!existsSync(expandedTarget)) {
    error(`Path does not exist: ${expandedTarget}`);
    return;
  }

  const stat = statSync(expandedTarget);

  if (stat.isFile()) {
    // Single file
    console.log();
    info(`Adding file: ${relativeTarget}`);

    const isPrivate = await confirm({
      message: "Is this file private? (sets permissions to 600)",
      default:
        relativeTarget.includes(".ssh") ||
        relativeTarget.includes("secret") ||
        relativeTarget.includes("credential"),
    });

    const isExecutable = await confirm({
      message: "Is this file executable?",
      default: stat.mode & 0o111 ? true : false,
    });

    const sourceName = toSourceName(relativeTarget, isPrivate, isExecutable);
    const sourcePath = join(sourceDir, sourceName);

    // Create parent directories if needed
    const sourceParentDir = dirname(sourcePath);
    if (!existsSync(sourceParentDir)) {
      mkdirSync(sourceParentDir, { recursive: true });
    }

    // Copy the file
    await copyFile(expandedTarget, sourcePath);

    // Set appropriate permissions on source
    const mode = getFileMode(sourceName);
    chmodSync(sourcePath, mode);

    success(`Added: ${relativeTarget} -> ${relative(expandPath("~"), sourcePath)}`);

    // Auto-push if enabled
    await gitCommitAndPush(sourceDir, {
      action: "add",
      files: [relativeTarget],
    });

    console.log();
  } else if (stat.isDirectory()) {
    // Directory - interactive selection
    console.log();
    info(`Adding directory: ${relativeTarget}`);
    console.log();

    const allFiles = listFilesRecursively(expandedTarget);
    const filteredFiles = allFiles.filter((f) => !shouldIgnore(f, dotsConfig.ignoredPatterns));

    if (filteredFiles.length === 0) {
      warn("No files found in directory (or all files are ignored)");
      return;
    }

    const selectedFiles = await checkbox({
      message: "Select files to add:",
      choices: filteredFiles.map((f) => ({
        name: f,
        value: f,
        checked: true,
      })),
      pageSize: 20,
    });

    if (selectedFiles.length === 0) {
      info("No files selected");
      return;
    }

    console.log();

    for (const file of selectedFiles) {
      const fullTargetPath = join(expandedTarget, file);
      const fullRelativePath = join(relativeTarget, file);
      const fileStat = statSync(fullTargetPath);

      const sourceName = toSourceName(
        fullRelativePath,
        false,
        fileStat.mode & 0o111 ? true : false
      );
      const sourcePath = join(sourceDir, sourceName);

      // Create parent directories if needed
      const sourceParentDir = dirname(sourcePath);
      if (!existsSync(sourceParentDir)) {
        mkdirSync(sourceParentDir, { recursive: true });
      }

      // Copy the file
      await copyFile(fullTargetPath, sourcePath);

      const mode = getFileMode(sourceName);
      chmodSync(sourcePath, mode);

      success(`Added: ${fullRelativePath}`);
    }

    console.log();
    info(`Added ${selectedFiles.length} file(s)`);

    // Auto-push if enabled
    const addedPaths = selectedFiles.map((f) => join(relativeTarget, f));
    await gitCommitAndPush(sourceDir, {
      action: "add",
      files: addedPaths,
    });

    console.log();
  }
}

async function dotsApply(): Promise<void> {
  const dotsConfig = getDotsConfig();
  const sourceDir = expandPath(dotsConfig.sourceDir);
  const targetDir = expandPath(dotsConfig.targetDir);

  if (!existsSync(sourceDir)) {
    error(`Source directory does not exist: ${sourceDir}`);
    info("Run 'h dots add' to add some files first");
    return;
  }

  console.log();
  info("Applying dotfiles...");
  console.log();

  const sourceFiles = listFilesRecursively(sourceDir);
  let appliedCount = 0;
  let skippedCount = 0;

  for (const sourceFile of sourceFiles) {
    // Skip .git directory
    if (sourceFile.startsWith(".git/") || sourceFile === ".git") continue;

    const targetName = toTargetName(sourceFile);
    const sourcePath = join(sourceDir, sourceFile);
    const targetPath = join(targetDir, targetName);

    const isDifferent = await filesAreDifferent(sourcePath, targetPath);

    if (!isDifferent) {
      skippedCount++;
      continue;
    }

    // Show diff if target exists and is different
    if (existsSync(targetPath)) {
      const sourceContent = await readFile(sourcePath);
      const targetContent = await readFile(targetPath);

      console.log(chalk.yellow(`\nFile differs: ${targetName}`));
      console.log(
        generateDiff(
          targetContent,
          sourceContent,
          `~/${targetName} (current)`,
          `repo/${sourceFile}`
        )
      );
      console.log();

      const shouldOverwrite = await confirm({
        message: `Overwrite ~/${targetName}?`,
        default: false,
      });

      if (!shouldOverwrite) {
        skippedCount++;
        continue;
      }
    }

    // Create parent directories if needed
    const targetParentDir = dirname(targetPath);
    if (!existsSync(targetParentDir)) {
      mkdirSync(targetParentDir, { recursive: true });
    }

    // Copy the file
    await copyFile(sourcePath, targetPath);

    // Set appropriate permissions
    const mode = getFileMode(sourceFile);
    chmodSync(targetPath, mode);

    success(`Applied: ${targetName}`);
    appliedCount++;
  }

  console.log();
  info(`Applied ${appliedCount} file(s), skipped ${skippedCount} file(s)`);
  console.log();
}

async function dotsSync(): Promise<void> {
  const dotsConfig = getDotsConfig();
  const sourceDir = expandPath(dotsConfig.sourceDir);
  const targetDir = expandPath(dotsConfig.targetDir);

  if (!existsSync(sourceDir)) {
    error(`Source directory does not exist: ${sourceDir}`);
    return;
  }

  console.log();
  info("Syncing dotfiles...");
  console.log();

  const sourceFiles = listFilesRecursively(sourceDir);
  let syncedCount = 0;
  let removedCount = 0;
  const updatedFiles: string[] = [];
  const removedFiles: string[] = [];

  for (const sourceFile of sourceFiles) {
    // Skip .git directory
    if (sourceFile.startsWith(".git/") || sourceFile === ".git") continue;

    const targetName = toTargetName(sourceFile);
    const sourcePath = join(sourceDir, sourceFile);
    const targetPath = join(targetDir, targetName);

    // Check if file was removed from home
    if (!existsSync(targetPath)) {
      console.log(chalk.yellow(`\nFile removed from home: ${targetName}`));

      const shouldDelete = await confirm({
        message: `Delete ${sourceFile} from repo?`,
        default: false,
      });

      if (shouldDelete) {
        const file = Bun.file(sourcePath);
        await Bun.write(sourcePath, ""); // Clear the file first
        // Use unlink via fs
        const { unlinkSync } = await import("fs");
        unlinkSync(sourcePath);
        success(`Removed: ${sourceFile}`);
        removedCount++;
        removedFiles.push(targetName);
      }
      continue;
    }

    // Check if files are different
    const isDifferent = await filesAreDifferent(sourcePath, targetPath);

    if (isDifferent) {
      const sourceContent = await readFile(sourcePath);
      const targetContent = await readFile(targetPath);

      console.log(chalk.yellow(`\nFile modified: ${targetName}`));
      console.log(
        generateDiff(
          sourceContent,
          targetContent,
          `repo/${sourceFile}`,
          `~/${targetName} (current)`
        )
      );
      console.log();

      const direction = await select({
        message: "Sync direction:",
        choices: [
          { name: "home -> repo (update repo with local changes)", value: "to-repo" },
          { name: "repo -> home (restore from repo)", value: "to-home" },
          { name: "Skip", value: "skip" },
        ],
      });

      if (direction === "to-repo") {
        await copyFile(targetPath, sourcePath);
        success(`Updated repo: ${sourceFile}`);
        syncedCount++;
        updatedFiles.push(targetName);
      } else if (direction === "to-home") {
        await copyFile(sourcePath, targetPath);
        const mode = getFileMode(sourceFile);
        chmodSync(targetPath, mode);
        success(`Restored: ${targetName}`);
        syncedCount++;
      }
    }
  }

  console.log();
  info(`Synced ${syncedCount} file(s), removed ${removedCount} file(s)`);

  // Auto-push if enabled and there were changes
  if (updatedFiles.length > 0 || removedFiles.length > 0) {
    await gitCommitAndPush(sourceDir, {
      action: "sync",
      files: [...updatedFiles, ...removedFiles],
      updatedFiles,
      removedFiles,
    });
  }

  console.log();
}

async function dotsStatus(): Promise<void> {
  const dotsConfig = getDotsConfig();
  const sourceDir = expandPath(dotsConfig.sourceDir);
  const targetDir = expandPath(dotsConfig.targetDir);

  if (!existsSync(sourceDir)) {
    error(`Source directory does not exist: ${sourceDir}`);
    return;
  }

  console.log();
  console.log(chalk.bold("Dotfiles Status"));
  console.log(chalk.gray(`Source: ${sourceDir}`));
  console.log(chalk.gray(`Target: ${targetDir}`));
  console.log();

  const sourceFiles = listFilesRecursively(sourceDir);
  const modified: string[] = [];
  const missing: string[] = [];
  const synced: string[] = [];

  for (const sourceFile of sourceFiles) {
    // Skip .git directory
    if (sourceFile.startsWith(".git/") || sourceFile === ".git") continue;

    const targetName = toTargetName(sourceFile);
    const sourcePath = join(sourceDir, sourceFile);
    const targetPath = join(targetDir, targetName);

    if (!existsSync(targetPath)) {
      missing.push(targetName);
    } else {
      const isDifferent = await filesAreDifferent(sourcePath, targetPath);
      if (isDifferent) {
        modified.push(targetName);
      } else {
        synced.push(targetName);
      }
    }
  }

  if (modified.length > 0) {
    console.log(chalk.yellow("Modified:"));
    for (const file of modified) {
      console.log(chalk.yellow(`  M ${file}`));
    }
    console.log();
  }

  if (missing.length > 0) {
    console.log(chalk.red("Missing from home:"));
    for (const file of missing) {
      console.log(chalk.red(`  D ${file}`));
    }
    console.log();
  }

  if (synced.length > 0) {
    console.log(chalk.green("In sync:"));
    for (const file of synced) {
      console.log(chalk.green(`  ✓ ${file}`));
    }
    console.log();
  }

  if (modified.length === 0 && missing.length === 0) {
    success("All dotfiles are in sync!");
    console.log();
  }
}

async function dotsDiff(file?: string): Promise<void> {
  const dotsConfig = getDotsConfig();
  const sourceDir = expandPath(dotsConfig.sourceDir);
  const targetDir = expandPath(dotsConfig.targetDir);

  if (!existsSync(sourceDir)) {
    error(`Source directory does not exist: ${sourceDir}`);
    return;
  }

  const sourceFiles = listFilesRecursively(sourceDir);

  for (const sourceFile of sourceFiles) {
    // Skip .git directory
    if (sourceFile.startsWith(".git/") || sourceFile === ".git") continue;

    const targetName = toTargetName(sourceFile);

    // If specific file is requested, skip others
    if (file && !targetName.includes(file) && !sourceFile.includes(file)) continue;

    const sourcePath = join(sourceDir, sourceFile);
    const targetPath = join(targetDir, targetName);

    if (!existsSync(targetPath)) {
      console.log(chalk.red(`\n${targetName}: missing from home`));
      continue;
    }

    const isDifferent = await filesAreDifferent(sourcePath, targetPath);

    if (isDifferent) {
      const sourceContent = await readFile(sourcePath);
      const targetContent = await readFile(targetPath);

      console.log(chalk.bold(`\n${targetName}:`));
      console.log(
        generateDiff(sourceContent, targetContent, `repo/${sourceFile}`, `~/${targetName}`)
      );
    } else if (file) {
      // Only show "in sync" message if specific file was requested
      success(`${targetName}: in sync`);
    }
  }

  console.log();
}

async function dotsList(): Promise<void> {
  const dotsConfig = getDotsConfig();
  const sourceDir = expandPath(dotsConfig.sourceDir);
  const targetDir = expandPath(dotsConfig.targetDir);

  if (!existsSync(sourceDir)) {
    error(`Source directory does not exist: ${sourceDir}`);
    info("Run 'h dots add' to add some files first");
    return;
  }

  console.log();
  console.log(chalk.bold("Managed Dotfiles"));
  console.log(chalk.gray(`Source: ${sourceDir}`));
  console.log();

  const sourceFiles = listFilesRecursively(sourceDir);
  let count = 0;

  for (const sourceFile of sourceFiles) {
    // Skip .git directory
    if (sourceFile.startsWith(".git/") || sourceFile === ".git") continue;

    const targetName = toTargetName(sourceFile);
    const targetPath = join(targetDir, targetName);

    const flags: string[] = [];
    if (isPrivateSource(sourceFile)) flags.push(chalk.yellow("private"));
    if (isExecutableSource(sourceFile)) flags.push(chalk.cyan("executable"));

    const exists = existsSync(targetPath);
    const statusIcon = exists ? chalk.green("✓") : chalk.red("✗");

    const flagStr = flags.length > 0 ? ` (${flags.join(", ")})` : "";
    console.log(`  ${statusIcon} ${targetName}${flagStr}`);
    count++;
  }

  console.log();
  info(`Total: ${count} file(s)`);
  console.log();
}

async function dotsRm(targetPath: string): Promise<void> {
  const dotsConfig = getDotsConfig();
  const sourceDir = expandPath(dotsConfig.sourceDir);
  const targetDir = expandPath(dotsConfig.targetDir);
  const expandedTarget = expandPath(targetPath);

  // Make path relative to targetDir
  let relativeTarget = targetPath;
  if (expandedTarget.startsWith(targetDir)) {
    relativeTarget = relative(targetDir, expandedTarget);
  } else if (expandedTarget.startsWith(process.env.HOME || "")) {
    relativeTarget = relative(process.env.HOME || "", expandedTarget);
  }

  // Find the corresponding source file
  const sourceFiles = listFilesRecursively(sourceDir);
  let foundSource: string | null = null;

  for (const sourceFile of sourceFiles) {
    const targetName = toTargetName(sourceFile);
    if (targetName === relativeTarget) {
      foundSource = sourceFile;
      break;
    }
  }

  if (!foundSource) {
    error(`File not found in dotfiles repo: ${relativeTarget}`);
    return;
  }

  const sourcePath = join(sourceDir, foundSource);

  console.log();
  const confirmed = await confirm({
    message: `Remove ${foundSource} from dotfiles repo?`,
    default: false,
  });

  if (!confirmed) {
    info("Cancelled");
    return;
  }

  const { unlinkSync } = await import("fs");
  unlinkSync(sourcePath);

  success(`Removed: ${foundSource}`);
  info(`Note: ~/${relativeTarget} was NOT deleted`);

  // Auto-push if enabled
  await gitCommitAndPush(sourceDir, {
    action: "remove",
    files: [relativeTarget],
  });

  console.log();
}

// ============== Startup Check ==============

export async function checkDotfilesOnStartup(): Promise<void> {
  try {
    const config = loadConfig();
    const dots = config.dots;

    if (!dots || dots.checkInterval === 0) return;

    const sourceDir = expandPath(dots.sourceDir);
    const targetDir = expandPath(dots.targetDir);

    // Check if source directory exists
    if (!existsSync(sourceDir)) return;

    // Check if enough time has passed since last check
    if (dots.lastChecked) {
      const lastChecked = new Date(dots.lastChecked);
      const now = new Date();
      const hoursSinceLastCheck = (now.getTime() - lastChecked.getTime()) / (1000 * 60 * 60);

      if (hoursSinceLastCheck < dots.checkInterval) return;
    }

    // Update last checked time
    const updatedConfig: HConfig = {
      ...config,
      dots: {
        ...dots,
        lastChecked: new Date().toISOString(),
      },
    };
    saveConfig(updatedConfig);

    // Check for differences
    const sourceFiles = listFilesRecursively(sourceDir);
    const modified: string[] = [];
    const missing: string[] = [];

    for (const sourceFile of sourceFiles) {
      if (sourceFile.startsWith(".git/") || sourceFile === ".git") continue;

      const targetName = toTargetName(sourceFile);
      const sourcePath = join(sourceDir, sourceFile);
      const targetPath = join(targetDir, targetName);

      if (!existsSync(targetPath)) {
        missing.push(targetName);
      } else {
        const isDifferent = await filesAreDifferent(sourcePath, targetPath);
        if (isDifferent) {
          modified.push(targetName);
        }
      }
    }

    // Show warning if there are changes
    const totalChanges = modified.length + missing.length;
    if (totalChanges > 0) {
      console.log();
      warn(
        chalk.yellow(`Dotfiles out of sync: ${modified.length} modified, ${missing.length} missing`)
      );
      info(
        `Run ${chalk.cyan("h dots status")} to see details or ${chalk.cyan("h dots sync")} to sync`
      );
      console.log();
    }
  } catch {
    // Silently ignore errors during startup check
  }
}

// ============== Register Commands ==============

export function registerDotsCommands(program: Command): void {
  const dots = program.command("dots").description("Manage dotfiles (chezmoi-compatible)");

  dots
    .command("add")
    .argument("<path>", "File or directory to add")
    .description("Add a file or directory to the dotfiles repo")
    .action(async (path: string) => {
      await dotsAdd(path);
    });

  dots
    .command("apply")
    .description("Apply dotfiles from repo to home directory")
    .action(async () => {
      await dotsApply();
    });

  dots
    .command("sync")
    .description("Sync dotfiles - detect changes and removals")
    .action(async () => {
      await dotsSync();
    });

  dots
    .command("status")
    .description("Show status of dotfiles (modified, new, removed)")
    .action(async () => {
      await dotsStatus();
    });

  dots
    .command("diff")
    .argument("[file]", "Specific file to diff")
    .description("Show differences between repo and home")
    .action(async (file?: string) => {
      await dotsDiff(file);
    });

  dots
    .command("list")
    .alias("ls")
    .description("List all managed dotfiles")
    .action(async () => {
      await dotsList();
    });

  dots
    .command("rm")
    .argument("<path>", "File to remove from management")
    .description("Remove a file from dotfiles management")
    .action(async (path: string) => {
      await dotsRm(path);
    });
}
