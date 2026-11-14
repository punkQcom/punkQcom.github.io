// Fetch every lunch menu from this machine and publish the result.
//
//   npm run lunch:publish                     # every restaurant
//   npm run lunch:publish -- --only gatorade  # extra args go to fetch.py
//
// Steps: git pull -> fetch.py --strict -> commit + push products/lunch if it
// changed. Only products/lunch is committed; anything else in the working
// tree is left alone. Whatever was fetched is published even when one site
// failed (e.g. a 403); the exit code is then 1 so the failure stays visible.
//
// Python: uses uv when installed (as the other npm scripts do), otherwise a
// plain python3 / python / py -3 — fetch.py is stdlib-only.

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const FETCH = ".github/lunch/fetch.py";
const OUT = "products/lunch";

function run(cmd, args, { capture = false } = {}) {
  const r = spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
    encoding: "utf8",
  });
  return { status: r.error ? -1 : r.status, out: (r.stdout || "").trim(), err: (r.stderr || "").trim() };
}

function step(msg) {
  console.log(`\n== ${msg}`);
}

function stop(msg) {
  console.error(`\n✗ ${msg}`);
  process.exit(1);
}

function python() {
  if (run("uv", ["--version"], { capture: true }).status === 0)
    return ["uv", ["run", "--no-project", "--python", "3.12", "--with", "tzdata", FETCH]];
  for (const [cmd, pre] of [["python3", []], ["python", []], ["py", ["-3"]]]) {
    if (run(cmd, [...pre, "--version"], { capture: true }).status === 0) return [cmd, [...pre, FETCH]];
  }
  return null;
}

// "lunch: 14.11. 17.42", the same shape as the scheduled runs' commits.
function stamp() {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Helsinki", day: "numeric", month: "numeric",
      hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date()).map((x) => [x.type, x.value]),
  );
  return `${p.day}.${p.month}. ${p.hour}.${p.minute}`;
}

step("Getting the latest version from GitHub");
if (run("git", ["pull", "--ff-only"]).status !== 0)
  stop("git pull failed — sort that out first (e.g. uncommitted edits in products/lunch), then run this again.");

const py = python();
if (!py) stop("No Python found. Install uv (brew install uv) or Python 3, then run this again.");

step("Fetching menus");
const fetched = run(py[0], [...py[1], "--strict", ...process.argv.slice(2)]);

const changed = run("git", ["status", "--porcelain", "--", OUT], { capture: true }).out;
if (!changed) {
  step("Nothing new to publish — the site already has everything that was found.");
} else {
  step("Publishing");
  const msg = `lunch: ${stamp()} (local run)`;
  if (run("git", ["add", "--", OUT]).status !== 0) stop("git add failed.");
  if (run("git", ["commit", "-q", "-m", msg, "--", OUT]).status !== 0) stop("git commit failed.");
  if (run("git", ["push", "-q"]).status !== 0)
    stop("git push failed — the commit is saved locally. Run `git pull --rebase && git push` to retry.");
  console.log(`✓ Pushed "${msg}". The site updates in a minute or two.`);
}

if (fetched.status !== 0) {
  console.error("\n! Some restaurants could not be fetched (see the summary above). Everything else was published.");
  process.exit(1);
}
