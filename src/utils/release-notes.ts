import { exec } from "./exec";
import { generateAIResponse } from "./ai";

interface CategorizedCommits {
  feat: string[];
  fix: string[];
  docs: string[];
  style: string[];
  refactor: string[];
  perf: string[];
  test: string[];
  build: string[];
  ci: string[];
  chore: string[];
  revert: string[];
  other: string[];
}

/**
 * Categorize commits by conventional commit type
 */
export function categorizeCommits(commitLog: string): CategorizedCommits {
  const commits: CategorizedCommits = {
    feat: [],
    fix: [],
    docs: [],
    style: [],
    refactor: [],
    perf: [],
    test: [],
    build: [],
    ci: [],
    chore: [],
    revert: [],
    other: [],
  };

  const lines = commitLog.split("\n").filter(Boolean);

  for (const line of lines) {
    // Format: "abc1234 feat: add new feature"
    const match = line.match(/^[a-f0-9]+\s+(\w+)(?:\(.+?\))?:\s*(.+)$/i);

    if (match) {
      const [, type, message] = match;
      const lowerType = type.toLowerCase();

      if (lowerType in commits) {
        commits[lowerType as keyof CategorizedCommits].push(message.trim());
      } else {
        commits.other.push(line.trim());
      }
    } else {
      commits.other.push(line.trim());
    }
  }

  return commits;
}

/**
 * Get relevant diffs for release notes, filtering out noise
 * Note: exec() uses Bun.spawn with array args - safe from injection
 */
export async function getRelevantDiffs(
  fromRef: string,
  toRef: string = "HEAD",
  maxChars: number = 50000
): Promise<string> {
  // Patterns to exclude from diffs
  const excludePatterns = [
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

  try {
    // Get full diff with exclusions
    const diff = await exec([
      "git",
      "diff",
      `${fromRef}...${toRef}`,
      "--",
      ".",
      ...excludePatterns,
    ]);

    // If diff is too large, return only stats
    if (diff.length > maxChars) {
      const stats = await exec([
        "git",
        "diff",
        "--stat",
        `${fromRef}...${toRef}`,
        "--",
        ".",
        ...excludePatterns,
      ]);
      return `Diff too large, showing stats only:\n\n${stats}`;
    }

    return diff;
  } catch (err) {
    return "";
  }
}

/**
 * Get GitHub repository info from git remote
 */
async function getGitHubRepo(): Promise<string | null> {
  try {
    const remote = await exec(["git", "remote", "get-url", "origin"]);
    // Parse GitHub URL (supports both HTTPS and SSH)
    const match = remote.match(/github\.com[:/](.+?)(?:\.git)?$/);
    if (match) {
      return match[1]; // Returns "owner/repo"
    }
  } catch (err) {
    // Not a git repo or no origin
  }
  return null;
}

/**
 * Generate detailed release notes using AI
 */
export async function generateReleaseNotes(
  version: string,
  lastTag: string,
  commitLog: string,
  diffs: string,
  fileStats: string
): Promise<string> {
  const categorized = categorizeCommits(commitLog);

  // Build commit summary by category
  let commitSummary = "";
  const categories = [
    { key: "feat", label: "Features" },
    { key: "fix", label: "Bug Fixes" },
    { key: "perf", label: "Performance" },
    { key: "refactor", label: "Refactoring" },
    { key: "docs", label: "Documentation" },
    { key: "test", label: "Tests" },
    { key: "build", label: "Build" },
    { key: "ci", label: "CI" },
    { key: "chore", label: "Chores" },
  ];

  for (const { key, label } of categories) {
    const commits = categorized[key as keyof CategorizedCommits];
    if (commits.length > 0) {
      commitSummary += `\n### ${label}\n`;
      commits.forEach((msg) => {
        commitSummary += `- ${msg}\n`;
      });
    }
  }

  // Get GitHub repo for compare link
  const githubRepo = await getGitHubRepo();
  let changelogSection = "";

  if (githubRepo && lastTag) {
    changelogSection = `\n## 📝 Full Changelog\nSee all changes: https://github.com/${githubRepo}/compare/${lastTag}...v${version}`;
  }

  const prompt = `Generate comprehensive release notes for version ${version}.

You are creating release notes for a software release. Analyze the changes and create a well-structured markdown document.

## Commits since ${lastTag}:
${commitSummary}

## File Statistics:
${fileStats}

## Changes (diffs):
${diffs.substring(0, 30000)}${diffs.length > 30000 ? "\n\n... (truncated)" : ""}

Please generate release notes in the following format:

# Release v${version}

## 🎉 Highlights
[2-3 sentences describing the most important changes]

## ✨ What's New
[Bullet points of new features and improvements, grouped logically]

## 🐛 Bug Fixes
[List of bug fixes if any]

## 🔧 Technical Changes
[Developer-relevant changes like refactoring, dependency updates, etc.]

Keep it clear, concise, and user-friendly. Use emojis sparingly and professionally.
Do NOT include a "Full Changelog" section - I will add it automatically.`;

  const aiNotes = await generateAIResponse(prompt);

  // Add changelog link at the end if available
  return aiNotes + changelogSection;
}

/**
 * Update or create CHANGELOG.md with new release
 */
export function updateChangelog(
  version: string,
  releaseNotes: string,
  existingChangelog: string = ""
): string {
  const date = new Date().toISOString().split("T")[0];
  const header = `# Changelog

All notable changes to this project will be documented in this file.

`;

  // Extract the release notes content (remove the title line if present)
  let notesContent = releaseNotes;
  if (notesContent.startsWith("# Release")) {
    notesContent = notesContent.split("\n").slice(1).join("\n").trim();
  }

  const newEntry = `
## [${version}] - ${date}

${notesContent}

---

`;

  if (!existingChangelog || existingChangelog.trim() === "") {
    return header + newEntry;
  }

  // If changelog exists, insert new entry after header
  const lines = existingChangelog.split("\n");
  let insertIndex = 0;

  // Find where to insert (after initial header/description)
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("## [")) {
      insertIndex = i;
      break;
    }
  }

  if (insertIndex === 0) {
    // No previous entries found, append to end
    return existingChangelog.trim() + "\n\n" + newEntry;
  }

  // Insert before first entry
  lines.splice(insertIndex, 0, newEntry);
  return lines.join("\n");
}
