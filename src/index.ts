#!/usr/bin/env node
import * as readline from "readline";
import c from "chalk";
import { Locateable, formatLocateable } from "@marvinh/locateable-error";
import { readFileSync } from "fs";
import { execSync, spawnSync, spawn } from "child_process";
import * as mri from "mri";
import { basename, dirname, sep } from "path";

let deopt = false;
let counter = 0;

const args = mri(process.argv, {
  boolean: ["short", "help", "bail"],
  alias: { h: "help" },
});

export function showHelp() {
  process.stdout.write(`
🔍  Print V8 deoptimization reasons in a developer friendly way

${c.underline("Usage:")}
  $ perfdoc [options] <file>

${c.underline("Options:")}
  --short      Hide code frame
  --bail       Exit with code 1 if a deoptimization has been found
  --help, -h   Show usage information and the options listed here

${c.underline("Examples:")}
  $ perfdoc foo.js
  $ perfdoc --short foo.js
  $ node --trace-deopt foo.js | perfdoc
  `);
  process.exit(0);
}

if (args.help) {
  showHelp();
}

const short = !!args.short;

if (args._.length > 2) {
  const out = execSync("node --trace-deopt " + args._[2]);
  const lines = Buffer.isBuffer(out) ? out.toString("utf8") : out;
  lines.split("\n").map(parseLine);
  exitIfBail();
} else {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  // Show help if we don't receive something via stdin
  const timer = setTimeout(showHelp, 100);

  rl.on("line", input => {
    parseLine(input);
    clearTimeout(timer);
  });
  rl.on("close", () => exitIfBail());
}

export function exitIfBail() {
  if (counter > 0 && args.bail) {
    process.exit(1);
  }
}

export function parseLine(str: string) {
  if (/\[deoptimizing.*begin/.test(str)) {
    deopt = true;
    counter++;
  } else if (deopt) {
    deopt = false;
    const match = /\<(.*)\:(\d+)\:(\d+)\>,\s+(.*)/.exec(str);
    if (match === null) {
      throw new Error(
        "Could not get file information, please file a bug report.",
      );
    }

    const file = match[1];
    const line = Number(match[2]);
    const column = Number(match[3]);
    const message = match[4];

    process.stdout.write(c.red(`${counter}) ${message}\n`));

    const name = c.yellowBright(basename(file));
    const dir = c.dim(dirname(file) + sep);

    process.stdout.write(
      `  ${dir}${name}` + c.gray(":") + c.cyan(line + ":" + column) + `\n\n`,
    );

    if (!short) {
      const body = readFileSync(file, "utf8");
      const err: Locateable = {
        message,
        locations: [{ line, column }],
        source: { name: file, body },
      };

      process.stdout.write(
        formatLocateable(err, {
          highlightCode: true,
        }) + "\n\n\n",
      );
    }
  }
}
