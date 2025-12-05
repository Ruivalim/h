import { Command } from "commander";
import { execInteractive } from "../utils/exec";
import { info } from "../utils/icons";

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
}
