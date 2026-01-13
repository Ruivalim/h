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

          // For JS/TS files, try to extract meaningful information
          if (
            configFile.endsWith(".js") ||
            configFile.endsWith(".ts") ||
            configFile.endsWith(".cjs") ||
            configFile.endsWith(".mjs")
          ) {
            // Extract rules or extends from the config
            const extendsMatch = content.match(/extends:\s*\[([^\]]+)\]/);
            const rulesMatch = content.match(/rules:\s*\{([^}]+)\}/s);

            let configInfo = `Found commitlint config (${configFile}):\n`;

            if (extendsMatch) {
              const extendsValue = extendsMatch[1].trim().replace(/['"]/g, "");
              configInfo += `- Extends: ${extendsValue}\n`;
            }

            if (rulesMatch) {
              configInfo += `- Has custom rules defined\n`;
            }

            // Add a sample of the config
            configInfo += `\nConfig content:\n${content.substring(0, 500)}${content.length > 500 ? "..." : ""}`;

            return configInfo;
          } else if (configFile.endsWith(".json") || configFile.endsWith(".rc")) {
            // For JSON files, parse and summarize
            try {
              const config = JSON.parse(content);
              let configInfo = `Found commitlint config (${configFile}):\n`;

              if (config.extends) {
                configInfo += `- Extends: ${Array.isArray(config.extends) ? config.extends.join(", ") : config.extends}\n`;
              }

              if (config.rules) {
                configInfo += `- Has custom rules defined\n`;
              }

              configInfo += `\nConfig content:\n${JSON.stringify(config, null, 2)}`;

              return configInfo;
            } catch (err) {
              // Failed to parse JSON, return raw content
              return `Found commitlint config (${configFile}):\n${content}`;
            }
          } else {
            // YAML or other formats
            return `Found commitlint config (${configFile}):\n${content}`;
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
          let configInfo = "Found commitlint config in package.json:\n";

          if (packageJson.commitlint.extends) {
            configInfo += `- Extends: ${Array.isArray(packageJson.commitlint.extends) ? packageJson.commitlint.extends.join(", ") : packageJson.commitlint.extends}\n`;
          }

          if (packageJson.commitlint.rules) {
            configInfo += `- Has custom rules defined\n`;
          }

          configInfo += `\nConfig content:\n${JSON.stringify(packageJson.commitlint, null, 2)}`;

          return configInfo;
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
