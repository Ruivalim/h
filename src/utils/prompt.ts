import {
  select as inquirerSelect,
  checkbox as inquirerCheckbox,
  search as inquirerSearch,
} from "@inquirer/prompts";
import { ExitPromptError } from "@inquirer/core";

type SelectConfig = Parameters<typeof inquirerSelect>[0];
type CheckboxConfig = Parameters<typeof inquirerCheckbox>[0];
type SearchConfig = Parameters<typeof inquirerSearch>[0];

export async function select<T>(config: SelectConfig): Promise<T | null> {
  try {
    return (await inquirerSelect(config)) as T;
  } catch (err) {
    if (err instanceof ExitPromptError) {
      process.exit(0);
    }
    throw err;
  }
}

export async function checkbox<T>(config: CheckboxConfig): Promise<T[]> {
  try {
    return (await inquirerCheckbox(config)) as T[];
  } catch (err) {
    if (err instanceof ExitPromptError) {
      process.exit(0);
    }
    throw err;
  }
}

export async function search<T>(config: SearchConfig): Promise<T | null> {
  try {
    return (await inquirerSearch(config)) as T;
  } catch (err) {
    if (err instanceof ExitPromptError) {
      process.exit(0);
    }
    throw err;
  }
}
