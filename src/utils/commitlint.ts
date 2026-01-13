import { existsSync, readFileSync } from "fs";
import { join } from "path";

/**
 * Possible commitlint config file names
 */
const CONFIG_FILES = [
  "commitlint.config.js",
  "commitlint.config.cjs",
  "commitlint.config.mjs",
  "commitlint.config.ts",
  ".commitlintrc",
  ".commitlintrc.json",
  ".commitlintrc.js",
  ".commitlintrc.cjs",
  ".commitlintrc.yaml",
  ".commitlintrc.yml",
];

/**
 * Load commitlint configuration from the current directory
 * Returns a string description of the config if found, or null if not found
 */
export async function loadCommitlintConfig(): Promise<string | null> {
  try {
    // Check for config files
    for (const configFile of CONFIG_FILES) {
      const configPath = join(process.cwd(), configFile);

      if (existsSync(configPath)) {
        try {
          // Read the config file content
          const content = readFileSync(configPath, "utf-8");

          // For JS/TS files, return the full content
          if (
            configFile.endsWith(".js") ||
            configFile.endsWith(".ts") ||
            configFile.endsWith(".cjs") ||
            configFile.endsWith(".mjs")
          ) {
            return `Commitlint config (${configFile}):\n\`\`\`js\n${content}\n\`\`\``;
          } else if (configFile.endsWith(".json") || configFile.endsWith(".rc")) {
            // For JSON files, return full content
            return `Commitlint config (${configFile}):\n\`\`\`json\n${content}\n\`\`\``;
          } else {
            // YAML or other formats - return full content
            return `Commitlint config (${configFile}):\n\`\`\`yaml\n${content}\n\`\`\``;
          }
        } catch (err) {
          // Skip this file if we can't read it
          continue;
        }
      }
    }

    // Check package.json for commitlint config
    const packageJsonPath = join(process.cwd(), "package.json");
    if (existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
        if (packageJson.commitlint) {
          const commitlintConfig = JSON.stringify(packageJson.commitlint, null, 2);
          return `Commitlint config in package.json:\n\`\`\`json\n${commitlintConfig}\n\`\`\``;
        }
      } catch (err) {
        // Ignore package.json parse errors
      }
    }

    return null;
  } catch (err) {
    return null;
  }
}
