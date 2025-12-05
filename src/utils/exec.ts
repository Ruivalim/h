export async function exec(cmd: string[]): Promise<string> {
  const result = await Bun.spawn(cmd, {
    stdout: "pipe",
    stderr: "pipe",
  });
  const output = await new Response(result.stdout).text();
  return output.trim();
}

export async function execInteractive(cmd: string[]): Promise<void> {
  const proc = Bun.spawn(cmd, {
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  });
  await proc.exited;
}

export async function execPipe(cmd: string[], input: string): Promise<void> {
  const proc = Bun.spawn(cmd, {
    stdin: new TextEncoder().encode(input),
    stdout: "inherit",
    stderr: "inherit",
  });
  await proc.exited;
}

export async function withSpinner<T>(message: string, fn: () => Promise<T>): Promise<T> {
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  let i = 0;
  const spinner = globalThis.setInterval(() => {
    process.stdout.write(`\r${frames[i++ % frames.length]} ${message}`);
  }, 80);

  try {
    const result = await fn();
    return result;
  } finally {
    globalThis.clearInterval(spinner);
    process.stdout.write("\r\x1b[K");
  }
}

export function getPlatform(): "darwin" | "linux" | "windows" | "unknown" {
  const platform = process.platform;
  if (platform === "darwin") return "darwin";
  if (platform === "linux") return "linux";
  if (platform === "win32") return "windows";
  return "unknown";
}

export async function commandExists(cmd: string): Promise<boolean> {
  try {
    const result = await Bun.spawn(["which", cmd], { stdout: "pipe" });
    await result.exited;
    return result.exitCode === 0;
  } catch {
    return false;
  }
}
