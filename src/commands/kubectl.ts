import { Command } from "commander";
import {
  selectResource,
  kubectlDescribe,
  kubectlDelete,
  kubectlLogs,
  kubectlExec,
  kubectlGetYaml,
  kubectlGetJson,
} from "../utils/kubectl";
import { exec, execInteractive } from "../utils/exec";
import { success, info } from "../utils/icons";

export function registerKubectlCommands(program: Command): void {
  const k = program.command("k").description("Kubectl helpers");

  k.command("gp")
    .description("Get pods")
    .argument("[name]", "Pod name filter")
    .action(async (name?: string) => {
      const args = ["kubectl", "get", "pod"];
      if (name) args.push(name);
      await execInteractive(args);
    });

  k.command("dlp")
    .description("Delete pod (interactive)")
    .action(async () => {
      const pod = await selectResource("pod", "Select pod to delete");
      if (pod) await kubectlDelete("pod", pod);
    });

  k.command("exp")
    .description("Exec into pod (interactive)")
    .option("-c, --command <cmd>", "Command to run", "bash")
    .option("--container <name>", "Container name")
    .action(async (opts) => {
      const pod = await selectResource("pod", "Select pod");
      if (pod) await kubectlExec(pod, opts.command, opts.container);
    });

  k.command("dcp")
    .description("Describe pod (interactive)")
    .action(async () => {
      const pod = await selectResource("pod", "Select pod to describe");
      if (pod) await kubectlDescribe("pod", pod);
    });

  k.command("dcn")
    .description("Describe node (interactive)")
    .action(async () => {
      const node = await selectResource("node", "Select node to describe");
      if (node) await kubectlDescribe("node", node);
    });

  k.command("lp")
    .description("Logs from pod (interactive)")
    .action(async () => {
      const pod = await selectResource("pod", "Select pod for logs");
      if (pod) await kubectlLogs(pod);
    });

  k.command("gcm")
    .description("Get configmap data (interactive)")
    .action(async () => {
      const cm = await selectResource("configmap", "Select configmap");
      if (!cm) return;
      const data = await kubectlGetJson("configmap", cm, "{.data}");
      try {
        const parsed = JSON.parse(data);
        for (const [key, value] of Object.entries(parsed)) {
          console.log(`${key}:\n${value}\n---`);
        }
      } catch {
        console.log(data);
      }
    });

  k.command("dcm")
    .description("Describe configmap (interactive)")
    .action(async () => {
      const cm = await selectResource("configmap", "Select configmap");
      if (cm) await kubectlDescribe("configmap", cm);
    });

  k.command("dlcm")
    .description("Delete configmap (interactive)")
    .action(async () => {
      const cm = await selectResource("configmap", "Select configmap to delete");
      if (cm) await kubectlDelete("configmap", cm);
    });

  k.command("gs")
    .description("Get secret data decoded (interactive)")
    .action(async () => {
      const secret = await selectResource("secret", "Select secret");
      if (!secret) return;
      const data = await kubectlGetJson("secret", secret, "{.data}");
      try {
        const parsed = JSON.parse(data);
        for (const [key, value] of Object.entries(parsed)) {
          const decoded = Buffer.from(value as string, "base64").toString();
          console.log(`${key}: ${decoded}`);
        }
      } catch {
        console.log(data);
      }
    });

  k.command("ds")
    .description("Describe secret (interactive)")
    .action(async () => {
      const secret = await selectResource("secret", "Select secret");
      if (secret) await kubectlDescribe("secret", secret);
    });

  k.command("dls")
    .description("Delete secret (interactive)")
    .action(async () => {
      const secret = await selectResource("secret", "Select secret to delete");
      if (secret) await kubectlDelete("secret", secret);
    });

  k.command("gsa")
    .description("Get serviceaccount yaml (interactive)")
    .action(async () => {
      const sa = await selectResource("serviceaccount", "Select serviceaccount");
      if (sa) await kubectlGetYaml("serviceaccount", sa);
    });

  k.command("gdp")
    .description("Get deployment yaml (interactive)")
    .action(async () => {
      const dep = await selectResource("deployment", "Select deployment");
      if (dep) await kubectlGetYaml("deployment", dep);
    });

  k.command("gep")
    .description("Get endpoints yaml (interactive)")
    .action(async () => {
      const ep = await selectResource("endpoints", "Select endpoints");
      if (ep) await kubectlGetYaml("endpoints", ep);
    });

  k.command("gns")
    .description("Switch namespace (interactive)")
    .action(async () => {
      const ns = await selectResource("namespace", "Select namespace");
      if (!ns) return;
      await exec(["kubectl", "config", "set-context", "--current", `--namespace=${ns}`]);
      success(`Switched to namespace: ${ns}`);
    });

  k.command("top")
    .description("Top pods by CPU")
    .action(async () => {
      await execInteractive(["sh", "-c", "kubectl top pods --sort-by=cpu | bat"]);
    });

  k.command("topn")
    .description("Top nodes by CPU")
    .action(async () => {
      await execInteractive(["sh", "-c", "kubectl top nodes --sort-by=cpu | bat"]);
    });

  k.command("debug")
    .description("Create debug pod and exec into it")
    .action(async () => {
      info("Creating debug pod...");
      await exec([
        "kubectl",
        "run",
        "debug-pod",
        "--image=praqma/network-multitool",
        "--restart=Never",
        "--command",
        "--",
        "/bin/sh",
        "-c",
        "while true; do sleep 3600; done",
      ]);
      await Bun.sleep(4000);
      await execInteractive(["kubectl", "exec", "-it", "debug-pod", "--", "/bin/sh"]);
    });

  k.command("gaz")
    .description("Get azurekeyvaultsecret yaml (interactive)")
    .action(async () => {
      const secret = await selectResource("azurekeyvaultsecrets", "Select azurekeyvaultsecret");
      if (secret) await kubectlGetYaml("azurekeyvaultsecrets", secret);
    });

  k.command("daz")
    .description("Describe azurekeyvaultsecret (interactive)")
    .action(async () => {
      const secret = await selectResource("azurekeyvaultsecrets", "Select azurekeyvaultsecret");
      if (secret) await kubectlDescribe("azurekeyvaultsecrets", secret);
    });
}
