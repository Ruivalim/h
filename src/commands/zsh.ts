import { Command } from "commander";
import { select, checkbox } from "../utils/prompt";
import { execInteractive } from "../utils/exec";
import { success, error, info } from "../utils/icons";
import chalk from "chalk";

const HOME = process.env.HOME || "";
const ZSHRC = `${HOME}/.zshrc`;
const ZSHRC_PATHS = `${HOME}/.zshrc_paths`;
const ZSH_CONFIG_DIR = `${HOME}/.config/zsh`;
const ZSH_COMPLETIONS_DIR = `${ZSH_CONFIG_DIR}/completions`;

async function ensureFile(filePath: string): Promise<void> {
  const file = Bun.file(filePath);
  if (!(await file.exists())) {
    await Bun.write(filePath, "");
    success(`Created ${filePath}`);
  }
}

async function getZshConfigFiles(): Promise<string[]> {
  const glob = new Bun.Glob("*.zsh");
  const files: string[] = [];
  for await (const file of glob.scan({ cwd: ZSH_CONFIG_DIR })) {
    files.push(file);
  }
  return files.sort();
}

async function getExportsFromFile(filePath: string): Promise<string[]> {
  const file = Bun.file(filePath);
  if (!(await file.exists())) return [];
  const content = await file.text();
  const lines = content.split("\n");
  return lines.filter((line) => line.trim().startsWith("export "));
}

async function removeLines(filePath: string, lines: string[]): Promise<void> {
  const file = Bun.file(filePath);
  const content = await file.text();
  const newContent = content
    .split("\n")
    .filter((line) => !lines.includes(line))
    .join("\n");
  await Bun.write(filePath, newContent);
}

async function appendLines(filePath: string, lines: string[]): Promise<void> {
  await ensureFile(filePath);
  const file = Bun.file(filePath);
  const content = await file.text();
  const newContent = content ? `${content}\n${lines.join("\n")}` : lines.join("\n");
  await Bun.write(filePath, newContent);
}

export function registerZshCommands(program: Command): void {
  const z = program.command("z").description("Zsh config manager");

  z.command("list")
    .alias("ls")
    .description("List all zsh config files")
    .action(async () => {
      console.log(chalk.bold("\nZsh Config Files:\n"));

      const zshrcExists = await Bun.file(ZSHRC).exists();
      const pathsExists = await Bun.file(ZSHRC_PATHS).exists();

      console.log(`  ${zshrcExists ? chalk.green("~/.zshrc") : chalk.dim("~/.zshrc (not found)")}`);
      console.log(
        `  ${pathsExists ? chalk.green("~/.zshrc_paths") : chalk.dim("~/.zshrc_paths (not found)")}`
      );

      console.log(chalk.bold(`\n~/.config/zsh:\n`));
      const files = await getZshConfigFiles();
      for (const file of files) {
        console.log(`  ${chalk.cyan(file)}`);
      }
      console.log();
    });

  z.command("edit")
    .alias("e")
    .description("Select and edit a zsh config file")
    .action(async () => {
      const files = await getZshConfigFiles();
      const choices = [
        { name: "~/.zshrc", value: ZSHRC },
        { name: "~/.zshrc_paths", value: ZSHRC_PATHS },
        ...files.map((f) => ({ name: f, value: `${ZSH_CONFIG_DIR}/${f}` })),
      ];

      const selected = await select<string>({ message: "Select file to edit", choices });
      if (selected) {
        await execInteractive(["nvim", selected]);
      }
    });

  z.command("exports")
    .argument("[source]", "zshrc (default) or paths")
    .option("-d, --delete", "Delete instead of move")
    .description("Move/delete exports between .zshrc and .zshrc_paths")
    .action(async (source?: string, opts?: { delete?: boolean }) => {
      const isFromPaths = source === "paths";
      const sourceFile = isFromPaths ? ZSHRC_PATHS : ZSHRC;
      const targetFile = isFromPaths ? ZSHRC : ZSHRC_PATHS;
      const sourceName = isFromPaths ? "~/.zshrc_paths" : "~/.zshrc";
      const targetName = isFromPaths ? "~/.zshrc" : "~/.zshrc_paths";

      const exports = await getExportsFromFile(sourceFile);
      if (exports.length === 0) {
        info(`No exports found in ${sourceName}`);
        return;
      }

      const choices = exports.map((exp) => ({
        name: exp.length > 70 ? exp.substring(0, 70) + "..." : exp,
        value: exp,
      }));

      const action = opts?.delete ? "delete" : `move to ${targetName}`;
      const selected = await checkbox<string>({
        message: `Select exports to ${action} (space to select, enter to confirm)`,
        choices,
      });

      if (!selected || selected.length === 0) {
        info("No exports selected");
        return;
      }

      await removeLines(sourceFile, selected);

      if (!opts?.delete) {
        await appendLines(targetFile, selected);
        success(`Moved ${selected.length} export(s) to ${targetName}`);
      } else {
        success(`Deleted ${selected.length} export(s) from ${sourceName}`);
      }
    });

  z.command("open")
    .argument(
      "[file]",
      "File to open (alias, config, functions, fzf, plugins_checker, zshrc, paths)"
    )
    .description("Open zsh config file directly")
    .action(async (file?: string) => {
      if (!file) {
        const files = await getZshConfigFiles();
        const choices = [
          { name: "~/.zshrc", value: ZSHRC },
          { name: "~/.zshrc_paths", value: ZSHRC_PATHS },
          ...files.map((f) => ({ name: f, value: `${ZSH_CONFIG_DIR}/${f}` })),
        ];

        const selected = await select<string>({ message: "Select file to open", choices });
        if (selected) {
          await execInteractive(["nvim", selected]);
        }
        return;
      }

      const fileMap: Record<string, string> = {
        zshrc: ZSHRC,
        paths: ZSHRC_PATHS,
        alias: `${ZSH_CONFIG_DIR}/alias.zsh`,
        config: `${ZSH_CONFIG_DIR}/config.zsh`,
        functions: `${ZSH_CONFIG_DIR}/functions.zsh`,
        fzf: `${ZSH_CONFIG_DIR}/fzf.zsh`,
        plugins_checker: `${ZSH_CONFIG_DIR}/plugins_checker.zsh`,
        plugins: `${ZSH_CONFIG_DIR}/plugins_checker.zsh`,
      };

      const target = fileMap[file] || `${ZSH_CONFIG_DIR}/${file}.zsh`;
      const exists = await Bun.file(target).exists();

      if (!exists) {
        error(`File not found: ${target}`);
        return;
      }

      await execInteractive(["nvim", target]);
    });

  z.command("autocomplete")
    .description("Setup zsh autocompletions for h CLI")
    .action(async () => {
      // Create completions directory
      const { mkdir } = await import("node:fs/promises");
      await mkdir(ZSH_COMPLETIONS_DIR, { recursive: true });

      // Generate completion script
      const completionScript = `#compdef h

_h() {
  local -a commands
  local -a k_subcommands
  local -a z_subcommands

  commands=(
    'k:Kubectl helpers'
    'azs:Switch Azure subscription'
    'oxker:Run oxker docker TUI'
    'update-abi:Update abi brew backups'
    'edit-nvim:Edit neovim config'
    'edit-zsh:Edit zsh config'
    'commit:Generate commit message with AI'
    'branch-diff:Generate diff report between branches with AI'
    'unquarantine:Remove macOS quarantine from app'
    'z:Zsh config manager'
    'release:Release a new version with hooks'
    'upgrade:Upgrade h CLI to latest version'
    'update:Upgrade h CLI to latest version'
    'uninstall:Uninstall h CLI from system'
  )

  k_subcommands=(
    'ctx:Switch kubectl context'
    'ns:Switch kubectl namespace'
    'pods:List pods in current namespace'
    'logs:Get logs from a pod'
    'exec:Exec into a pod'
    'port:Port forward to a pod'
  )

  z_subcommands=(
    'list:List all zsh config files'
    'ls:List all zsh config files'
    'edit:Select and edit a zsh config file'
    'e:Select and edit a zsh config file'
    'exports:Move/delete exports between files'
    'open:Open zsh config file directly'
    'autocomplete:Setup zsh autocompletions'
  )

  case "$words[2]" in
    k)
      _describe 'k subcommand' k_subcommands
      ;;
    z)
      _describe 'z subcommand' z_subcommands
      ;;
    *)
      _describe 'command' commands
      ;;
  esac
}

_h "$@"
`;

      const completionFile = `${ZSH_COMPLETIONS_DIR}/_h`;
      await Bun.write(completionFile, completionScript);
      success(`Created ${completionFile}`);

      // Check if fpath is already configured in zshrc_paths
      await ensureFile(ZSHRC_PATHS);
      const pathsContent = await Bun.file(ZSHRC_PATHS).text();
      const fpathLine = `fpath=(${ZSH_COMPLETIONS_DIR} $fpath)`;

      if (!pathsContent.includes(ZSH_COMPLETIONS_DIR)) {
        await Bun.write(ZSHRC_PATHS, pathsContent ? `${fpathLine}\n${pathsContent}` : fpathLine);
        success(`Added fpath to ~/.zshrc_paths`);
      } else {
        info("fpath already configured in ~/.zshrc_paths");
      }

      console.log(chalk.yellow("\nRestart your shell or run: source ~/.zshrc"));
    });

  z.argument("[file]", "Quick open file").action(async (file?: string) => {
    if (file) {
      const fileMap: Record<string, string> = {
        zshrc: ZSHRC,
        paths: ZSHRC_PATHS,
        alias: `${ZSH_CONFIG_DIR}/alias.zsh`,
        config: `${ZSH_CONFIG_DIR}/config.zsh`,
        functions: `${ZSH_CONFIG_DIR}/functions.zsh`,
        fzf: `${ZSH_CONFIG_DIR}/fzf.zsh`,
        plugins_checker: `${ZSH_CONFIG_DIR}/plugins_checker.zsh`,
        plugins: `${ZSH_CONFIG_DIR}/plugins_checker.zsh`,
      };

      const target = fileMap[file] || `${ZSH_CONFIG_DIR}/${file}.zsh`;
      const exists = await Bun.file(target).exists();

      if (!exists) {
        error(`File not found: ${target}`);
        return;
      }

      await execInteractive(["nvim", target]);
    } else {
      const files = await getZshConfigFiles();
      const choices = [
        { name: "~/.zshrc", value: ZSHRC },
        { name: "~/.zshrc_paths", value: ZSHRC_PATHS },
        ...files.map((f) => ({ name: f, value: `${ZSH_CONFIG_DIR}/${f}` })),
      ];

      const selected = await select<string>({ message: "Select file to edit", choices });
      if (selected) {
        await execInteractive(["nvim", selected]);
      }
    }
  });
}
