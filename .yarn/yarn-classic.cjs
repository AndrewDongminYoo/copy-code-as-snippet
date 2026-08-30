const { spawnSync } = require("node:child_process");

const yarnCommand = process.platform === "win32" ? "yarn.cmd" : "yarn";
const result = spawnSync(yarnCommand, process.argv.slice(2), {
  env: { ...process.env, YARN_IGNORE_PATH: "1" },
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.error) {
  throw result.error;
}

process.exitCode = result.status ?? 1;
