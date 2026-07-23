import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";

const generatedTypeDirs = [".next/types", ".next/dev/types"];

for (const directory of generatedTypeDirs) {
  rmSync(directory, { recursive: true, force: true });
}

const run = (command, args) => {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

run("next", ["typegen"]);
run("tsc", ["--noEmit"]);
