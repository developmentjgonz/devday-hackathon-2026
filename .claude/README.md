# Project agent guards

`CLAUDE.md` imports the project `AGENTS.md`. Claude Code loads the deny rules and hooks from `.claude/settings.json` after the project is trusted. These settings do not install hooks in Codex or other agents.

Use Python 3.10 or later and Gitleaks 8.30.1 or later. On this Mac, install the scanner with `brew install gitleaks`. The hooks also need Git, Node.js, and the project dependencies (`npm ci`). Use Claude Code 2.1.295 or later for `onFailure: "block"` and a current version that supports exec-form command hooks. Confirm the loaded project rules in `/permissions` and hooks in `/hooks` when starting Claude Code.

The PreToolUse hook scans every tool call's proposed content. For Edit and MultiEdit, it scans the new text, so a secret can be removed. For recognized Bash commit, push, and deploy commands, it also scans tracked and nonignored untracked files, plus complete indexed blobs (including binary staged files). The scanner extends its default rules, ignores repository allow comments and ignore files, and suppresses its output. It allows only three exact public fixture values: `YOUR_API_TOKEN`, `sk_live_abc123`, and the fixed test idempotency ID `c24ee2bf-7eee-4b38-9bf1-e9b589bdb389`. No files or credential patterns are excluded. New exceptions require user review of the protected runner. A missing scanner, a nonzero result, malformed input, or a timeout blocks the action. No proposed command is executed by the PreToolUse runner.

The deny rules block reads and edits of environment credentials and Codex authentication data. Secret-free `.env.example` and `.dev.vars.example` files remain available. The rules also block edits of Git internals and agent policy files. Changes to these controls require user review. The command policy blocks direct removal commands, Git reset/clean, force pushes, remote seed execution, remote D1 execute, and sandbox-disabling browser flags. It deliberately includes safe forms and dry runs of removal, reset, and clean. Production migrations use `wrangler d1 migrations apply`, not `d1 execute`.

Before every normal completion, the Stop hook runs the auth, directory, workspace, and unit test groups, then the guard tests. It has an internal shared 500-second deadline below the outer 600-second hook timeout. It does not bypass failed checks when `stop_hook_active` is true. Builds and focused browser checks still depend on the change. Other agents must run these completion checks themselves.

Run the guard checks with:

```sh
python3 -B -m unittest discover -s .claude/hooks/tests -v
```

Run the full completion gate with:

```sh
python3 -B -c 'import json, os; print(json.dumps({"cwd": os.getcwd(), "hook_event_name": "Stop"}))' | python3 -B .claude/hooks/check.py stop
```

The guard tests use temporary repositories, synthetic credentials, and mocked failing processes. Real Gitleaks integration checks run when the scanner is installed; they are skipped otherwise. A real PreToolUse call always blocks when the scanner is missing. The CI job runs the guard tests separately from the existing app checks.

These are checks on matching Claude Code events, not an OS security boundary. Token checks are conservative and are not a complete shell parser. Script indirection, encoded commands, arbitrary child processes, and external or historical commits can escape their scope. Native path denies do not control all child-process file access. Secret scanners can miss unknown secrets or report false positives. MCP inputs are scanned, but external server behavior and tool output are not inspected. A rejected change can be repaired through a safe edit; the hook does not scan the whole worktree on that edit.

Stop does not run on user interruption or API failure. Claude Code can also end a turn after its continuation cap, or if a Stop hook cannot start. Do not describe this hook as an unconditional completion gate. Keep CI as the deployment gate and use managed settings plus OS controls if a hard security boundary is required.

References: [Claude Code hooks](https://code.claude.com/docs/en/hooks), [permissions](https://code.claude.com/docs/en/permissions), and [Gitleaks](https://github.com/gitleaks/gitleaks).
