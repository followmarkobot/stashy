/**
 * Run Codex via the local Codex CLI (`codex exec`), analogous to
 * claude-cli.js's askClaude. Uses your Codex/OpenAI account, a separate
 * auth/session from Claude Code — that's the point: running Claude CLI and
 * Codex CLI concurrently on disjoint work partitions means an interactive
 * `claude` login on one doesn't take down the other's background batch job.
 *
 * Flags kept deliberately lean for pure text classification (no shell/file
 * access needed): -s read-only, --ephemeral (don't persist session state),
 * --ignore-user-config (skip loading hooks/MCP servers configured for
 * interactive use — pure overhead here), --output-last-message (clean final
 * answer in a file instead of parsing the interactive-mode stdout stream).
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { spawn } = require("child_process");

const DEFAULT_MODEL = process.env.CODEX_CLI_MODEL || "gpt-5.4";
const DEFAULT_EFFORT = process.env.CODEX_CLI_EFFORT || "low";

function askCodex(prompt, opts = {}) {
  const model = opts.model || DEFAULT_MODEL;
  const effort = opts.effort || DEFAULT_EFFORT;
  const timeoutMs = opts.timeoutMs ?? 300_000;
  const outFile = path.join(os.tmpdir(), `codex-out-${crypto.randomUUID()}.txt`);

  const args = [
    "exec",
    "--model", model,
    "-c", `model_reasoning_effort=${effort}`,
    "-s", "read-only",
    "--ephemeral",
    "--ignore-user-config",
    "--skip-git-repo-check",
    "--output-last-message", outFile,
    prompt,
  ];

  return new Promise((resolve, reject) => {
    const child = spawn("codex", args, { stdio: ["ignore", "pipe", "pipe"] });

    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGKILL");
      reject(new Error(`codex CLI timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on("data", () => {}); // discard interactive-mode noise; answer comes from outFile
    child.stderr.on("data", (d) => (stderr += d));

    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(
        err.code === "ENOENT"
          ? new Error("`codex` CLI not found on PATH — install Codex CLI or set PATH")
          : err
      );
    });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`codex CLI exited ${code}: ${stderr.trim() || "(no stderr)"}`));
        return;
      }
      let result;
      try {
        result = fs.readFileSync(outFile, "utf8");
      } catch (err) {
        reject(new Error(`codex CLI exited 0 but output file missing: ${err.message}`));
        return;
      } finally {
        fs.unlink(outFile, () => {});
      }
      resolve(result.trim());
    });
  });
}

module.exports = { askCodex };
