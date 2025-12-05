import { select } from "./prompt";
import { exec, execInteractive } from "./exec";
import { error } from "./icons";

export async function kubectlGet(resource: string): Promise<string[]> {
  const output = await exec(["kubectl", "get", resource, "--no-headers"]);
  if (!output) return [];
  return output.split("\n").filter(Boolean);
}

export async function selectResource(resource: string, message: string): Promise<string | null> {
  const items = await kubectlGet(resource);
  if (items.length === 0) {
    error(`No ${resource} found`);
    return null;
  }

  const choices = items.map((item) => {
    const name = item.split(/\s+/)[0];
    return { name: item, value: name };
  });

  const selected = await select<string>({
    message,
    choices,
  });

  return selected ?? null;
}

export async function kubectlDescribe(resource: string, name: string): Promise<void> {
  await execInteractive(["kubectl", "describe", resource, name]);
}

export async function kubectlDelete(resource: string, name: string): Promise<void> {
  await execInteractive(["kubectl", "delete", resource, name]);
}

export async function kubectlLogs(name: string, follow = true): Promise<void> {
  const args = ["kubectl", "logs"];
  if (follow) args.push("-f");
  args.push(name);
  await execInteractive(args);
}

export async function kubectlExec(pod: string, command: string, container?: string): Promise<void> {
  const args = ["kubectl", "exec", "-it", pod];
  if (container) {
    args.push("-c", container);
  }
  args.push("--", command);
  await execInteractive(args);
}

export async function kubectlGetYaml(resource: string, name: string): Promise<void> {
  await execInteractive(["sh", "-c", `kubectl get ${resource} ${name} -oyaml | bat -l yaml`]);
}

export async function kubectlGetJson(
  resource: string,
  name: string,
  jsonpath: string
): Promise<string> {
  return exec(["kubectl", "get", resource, name, "-o", `jsonpath=${jsonpath}`]);
}
