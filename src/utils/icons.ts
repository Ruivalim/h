import figures from "figures";
import chalk from "chalk";

export const icons = {
  success: chalk.green(figures.tick),
  error: chalk.red(figures.cross),
  warning: chalk.yellow(figures.warning),
  info: chalk.blue(figures.info),
  pointer: chalk.cyan(figures.pointer),
  arrowRight: chalk.cyan(figures.arrowRight),
  bullet: figures.bullet,
  line: figures.line,
};

export function success(msg: string): void {
  console.log(`${icons.success} ${msg}`);
}

export function error(msg: string): void {
  console.log(`${icons.error} ${msg}`);
}

export function warn(msg: string): void {
  console.log(`${icons.warning} ${msg}`);
}

export function info(msg: string): void {
  console.log(`${icons.info} ${msg}`);
}
