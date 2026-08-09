/**
 * Run Claude via the local Claude Code CLI (`claude -p`) instead of the
 * Messages API.
 *
 * Why: api.anthropic.com bills per token against Developer Platform credits,
 * which is a different account from a Claude subscription. The CLI runs on the
 * subscription you're already logged into, so these scripts don't need — and
 * shouldn't use — ANTHROPIC_API_KEY.
 *
 * The one trap: the CLI resolves credentials in the order
 *   ANTHROPIC_API_KEY -> ANTHROPIC_AUTH_TOKEN -> logged-in profile
 * so a key inherited from the parent process (these scripts load .env.local
 * into process.env) would silently put us back on API billing. We strip both
 * from the child env on every call.
 */

const { spawn } = require("child_process");

const DEFAULT_MODEL = process.env.CLAUDE_CLI_MODEL || "sonnet";

function childEnv() {
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;
  delete env.ANTHROPIC_AUTH_TOKEN;
  return env;
}

/**
 * Send a prompt to Claude and resolve with its text response.
 *
 * @param {string} prompt        the prompt text (piped in on stdin)
 * @param {object} [opts]
 * @param {string} [opts.model]  CLI model alias (default: sonnet)
 * @param {number} [opts.timeoutMs]
 * @returns {Promise<string>}
 */
function askClaude(prompt, opts = {}) {
  const model = opts.model || DEFAULT_MODEL;
  const timeoutMs = opts.timeoutMs ?? 300_000;

  return new Promise((resolve, reject) => {
    // --safe-mode disables hooks/MCP/plugins/skills (unlike --bare, it keeps
    // OAuth/subscription auth working normally — --bare forces
    // ANTHROPIC_API_KEY, which is exactly the metered billing this module
    // exists to avoid). Without this, a background `claude -p` call inherits
    // this repo's ambient session config: cmux's hook set and an
    // @perplexity-ai/mcp-server npx spawn, neither useful for a one-shot
    // text-in/text-out call, and together responsible for a batch job
    // observed to slow from ~seconds to ~5 minutes per call (2026-07-22).
    // --tools "" strips the built-in tool schema from the system prompt
    // (irrelevant token weight for pure classification/analysis calls).
    const child = spawn(
      "claude",
      ["-p", "--model", model, "--safe-mode", "--strict-mcp-config", "--tools", "", "--no-session-persistence"],
      { env: childEnv(), stdio: ["pipe", "pipe", "pipe"] }
    );

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGKILL");
      reject(new Error(`claude CLI timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));

    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(
        err.code === "ENOENT"
          ? new Error("`claude` CLI not found on PATH — install Claude Code or set CLAUDE_CLI_MODEL/PATH")
          : err
      );
    });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`claude CLI exited ${code}: ${stderr.trim() || "(no stderr)"}`));
        return;
      }
      resolve(stdout.trim());
    });

    child.stdin.end(prompt);
  });
}

/**
 * Ask Claude about local image files. The CLI reads them off disk itself, so
 * callers must write images somewhere readable first and pass absolute paths.
 *
 * @param {string} instruction
 * @param {string[]} imagePaths absolute paths
 * @param {object} [opts]
 * @returns {Promise<string>}
 */
function askClaudeAboutImages(instruction, imagePaths, opts = {}) {
  if (!imagePaths.length) throw new Error("askClaudeAboutImages requires at least one image path");
  const fileList = imagePaths.map((p) => `- ${p}`).join("\n");
  const prompt = [
    instruction,
    "",
    "Read these image files and base your answer only on their contents:",
    fileList,
  ].join("\n");
  return askClaude(prompt, opts);
}

module.exports = { askClaude, askClaudeAboutImages };
