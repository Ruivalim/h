import { Command } from "commander";
import { select } from "../utils/prompt";
import { exec, execInteractive, commandExists } from "../utils/exec";
import { success, error, info } from "../utils/icons";

export function registerAzureCommands(program: Command): void {
  program
    .command("azs")
    .description("Switch Azure subscription")
    .argument("[subscription]", "Subscription name or ID")
    .action(async (subscription?: string) => {
      if (!(await commandExists("az"))) {
        error("Azure CLI is not installed");
        process.exit(1);
      }

      try {
        await exec(["az", "account", "show"]);
      } catch {
        error("Not logged in to Azure. Please run 'az login' first.");
        process.exit(1);
      }

      if (subscription) {
        try {
          await exec(["az", "account", "set", "--subscription", subscription]);
          const current = await exec(["az", "account", "show", "--query", "name", "-o", "tsv"]);
          success(`Switched to subscription: ${current}`);
          await execInteractive(["az", "account", "show", "--output", "table"]);
        } catch {
          error(`Could not find subscription matching '${subscription}'`);
          info("Available subscriptions:");
          await execInteractive([
            "az",
            "account",
            "list",
            "--query",
            "[].{Name:name, ID:id, State:state}",
            "--output",
            "table",
          ]);
        }
        return;
      }

      const currentSub = await exec(["az", "account", "show", "--query", "name", "-o", "tsv"]);

      const subsOutput = await exec([
        "az",
        "account",
        "list",
        "--query",
        "[].{name:name, id:id}",
        "-o",
        "json",
      ]);

      const subs = JSON.parse(subsOutput) as Array<{ name: string; id: string }>;

      const choices = subs.map((sub) => ({
        name: `${sub.name} (${sub.id})`,
        value: sub.id,
      }));

      const selectedId = await select<string>({
        message: `Select Azure Subscription (Current: ${currentSub})`,
        choices,
      });

      if (!selectedId) {
        info("No subscription selected, aborting.");
        return;
      }
      await exec(["az", "account", "set", "--subscription", selectedId]);
      success(`Switched to subscription: ${selectedId}`);
    });
}
