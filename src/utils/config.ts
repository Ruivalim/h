import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

export interface HConfig {
  ai: {
    provider: "claude" | "ollama";
    ollama?: {
      model: string;
      baseUrl: string;
    };
  };
  updates: {
    checkOnStartup: boolean;
    lastChecked?: string;
  };
  dots?: {
    sourceDir: string;
    targetDir: string;
    ignoredPatterns: string[];
    autoPush: boolean;
    checkInterval: number; // hours, 0 = disabled
    lastChecked?: string; // ISO timestamp
  };
}

const DEFAULT_CONFIG: HConfig = {
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
    checkInterval: 24, // check every 24 hours
  },
};

function getConfigPath(): string {
  return join(process.env.HOME || "~", ".h.config.json");
}

export function loadConfig(): HConfig {
  const configPath = getConfigPath();

  if (!existsSync(configPath)) {
    // Create default config if it doesn't exist
    saveConfig(DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    const config = JSON.parse(content);
    // Merge with defaults to ensure all fields exist
    return { ...DEFAULT_CONFIG, ...config };
  } catch (err) {
    console.error(`Failed to parse config file: ${configPath}`);
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: HConfig): void {
  const configPath = getConfigPath();
  const configDir = join(process.env.HOME || "~", ".config");

  // Ensure .config directory exists (though we're using home directly)
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  try {
    writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
  } catch (err) {
    console.error(`Failed to save config file: ${configPath}`);
    throw err;
  }
}

export function updateConfig(updates: Partial<HConfig>): void {
  const config = loadConfig();
  const newConfig: HConfig = {
    ...config,
    ...updates,
    ai: { ...config.ai, ...(updates.ai || {}) },
    updates: { ...config.updates, ...(updates.updates || {}) },
  };

  // Handle dots separately to maintain type safety
  if (updates.dots || config.dots) {
    newConfig.dots = {
      ...DEFAULT_CONFIG.dots!,
      ...(config.dots || {}),
      ...(updates.dots || {}),
    };
  }

  saveConfig(newConfig);
}
