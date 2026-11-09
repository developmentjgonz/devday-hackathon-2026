import importlib.util
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch


SCRIPT = Path(__file__).resolve().parents[1] / "check.py"
SPEC = importlib.util.spec_from_file_location("agent_check", SCRIPT)
guard = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(guard)


def synthetic_secret():
    # Construct a scanner test value at runtime; never store a real credential.
    return "ghp_" + "Ab1Cd2Ef3Gh4Ij5Kl6Mn7Op8Qr9St0Uv1Wx2"


class GuardTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        subprocess.run(
            ["git", "init", "--quiet", str(self.root)], check=True,
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )

    def stage(self, name, content):
        (self.root / name).write_text(content)
        guard.git(self.root, "add", "--", name)

    def test_common_destructive_commands_are_rejected(self):
        commands = [
            "rm -rf src", "/bin/rm file", "env git -C . reset -q --hard",
            "git clean -nd", "git -C . push origin release --force-with-lease",
            "git push origin release -vf", "node --experimental-strip-types scripts/seed-user-photos.mjs --remote",
            "npx wrangler d1 execute DB --command 'DELETE FROM cats' --remote",
            "chrome --disable-setuid-sandbox", "chrome --no-sandbox=true",
            "chrome --single-process",
        ]
        for command in commands:
            with self.subTest(command=command), self.assertRaises(guard.Blocked):
                guard.check_command(command)

    def test_normal_release_and_migration_commands_are_allowed(self):
        for command in [
            "git push origin HEAD:release", "git push --follow-tags origin feature-fix",
            "git diff --stat", "node --test tests/unit/example.test.ts",
            "npx wrangler d1 migrations apply DB --remote",
        ]:
            with self.subTest(command=command):
                guard.check_command(command)

    def test_edit_can_remove_a_secret(self):
        data = {"old_string": synthetic_secret(), "new_string": "safe"}
        self.assertEqual(guard.proposed_content("Edit", data), b"safe")
        self.assertIn(synthetic_secret().encode(), guard.proposed_content("mcp__example__send", data))

    def test_multi_edit_scans_every_new_value(self):
        data = {"edits": [{"new_string": "safe"}, {"new_string": synthetic_secret()}]}
        self.assertIn(synthetic_secret().encode(), guard.proposed_content("MultiEdit", data))

    def test_missing_new_edit_content_is_an_error(self):
        with self.assertRaises(KeyError):
            guard.proposed_content("Edit", {"old_string": "old"})

    def test_snapshot_contains_staged_secret_after_worktree_is_cleaned(self):
        self.stage("new.txt", synthetic_secret())
        (self.root / "new.txt").write_text("safe")
        self.assertIn(synthetic_secret().encode(), guard.source_snapshot(self.root))

    def test_snapshot_contains_staged_binary_secret(self):
        path = self.root / "binary.dat"
        path.write_bytes(b"\0api_token = '" + synthetic_secret().encode() + b"'\n")
        guard.git(self.root, "add", "binary.dat")
        path.write_text("safe")
        self.assertIn(synthetic_secret().encode(), guard.source_snapshot(self.root))

    def test_snapshot_skips_missing_worktree_files(self):
        self.stage("gone.txt", "safe")
        (self.root / "gone.txt").unlink()
        self.assertIsInstance(guard.source_snapshot(self.root), bytes)

    def test_snapshot_includes_nonignored_untracked_files(self):
        (self.root / "new.txt").write_text(synthetic_secret())
        self.assertIn(synthetic_secret().encode(), guard.source_snapshot(self.root))

    def test_snapshot_does_not_read_ignored_credentials_or_link_targets(self):
        (self.root / ".gitignore").write_text(".env.local\n")
        target = self.root / ".env.local"
        target.write_text(synthetic_secret())
        (self.root / "link").symlink_to(target)
        self.assertNotIn(synthetic_secret().encode(), guard.source_snapshot(self.root))

    def test_pre_tool_never_executes_proposed_command(self):
        event = {"tool_name": "Bash", "tool_input": {"command": "echo safe"}}
        with patch.object(guard, "scan") as scan, patch.object(guard.subprocess, "run") as run:
            guard.pre_tool(self.root, event)
        scan.assert_called_once()
        self.assertIn(b"echo safe", scan.call_args.args[1])
        run.assert_not_called()

    def test_pre_tool_scans_source_before_publish(self):
        event = {"tool_name": "Bash", "tool_input": {"command": "git commit -m safe"}}
        self.stage("new.txt", "safe")
        with patch.object(guard, "scan") as scan:
            guard.pre_tool(self.root, event)
        self.assertEqual(scan.call_count, 2)

    def test_scanner_errors_and_findings_block(self):
        with patch.object(guard.subprocess, "run", return_value=subprocess.CompletedProcess([], 1)):
            with self.assertRaises(guard.Blocked):
                guard.scan(self.root, b"safe")

    def test_scanner_cannot_use_project_allow_configuration(self):
        with patch.dict(os.environ, {"GITLEAKS_CONFIG": "/bad", "GITLEAKS_CONFIG_TOML": "bad"}):
            with patch.object(guard.subprocess, "run", return_value=subprocess.CompletedProcess([], 0)) as run:
                guard.scan(self.root, b"safe")
        args, kwargs = run.call_args
        self.assertNotIn("GITLEAKS_CONFIG", kwargs["env"])
        self.assertEqual(kwargs["env"]["GITLEAKS_CONFIG_TOML"], guard.SCANNER_CONFIG)
        self.assertIn("--ignore-gitleaks-allow", args[0])

    def test_main_blocks_missing_scanner_without_echoing_input(self):
        event = {"cwd": str(self.root), "hook_event_name": "PreToolUse", "tool_name": "Write", "tool_input": {"content": synthetic_secret()}}
        error = io.StringIO()
        with patch.object(sys, "argv", [str(SCRIPT), "pre"]), patch.object(sys, "stdin", io.StringIO(json.dumps(event))), patch.object(sys, "stderr", error):
            with patch.object(guard, "scan", side_effect=FileNotFoundError(synthetic_secret())):
                self.assertEqual(guard.main(), 2)
        self.assertNotIn(synthetic_secret(), error.getvalue())

    def test_main_blocks_invalid_json_and_wrong_events(self):
        for payload in ["not json", json.dumps({"cwd": str(self.root), "hook_event_name": "Stop"})]:
            with patch.object(sys, "argv", [str(SCRIPT), "pre"]), patch.object(sys, "stdin", io.StringIO(payload)), patch.object(sys, "stderr", io.StringIO()):
                self.assertEqual(guard.main(), 2)

    def completion_fixture(self):
        for folder, extension in [("auth", "mjs"), ("directory", "mjs"), ("workspace", "mjs"), ("unit", "ts")]:
            path = self.root / "tests" / folder
            path.mkdir(parents=True)
            (path / f"example.test.{extension}").write_text("")
        path = self.root / ".claude/hooks/tests"
        path.mkdir(parents=True)
        (path / "test_check.py").write_text("")

    def test_stop_blocks_missing_test_groups(self):
        with self.assertRaises(guard.Blocked):
            guard.stop(self.root)

    def test_stop_runs_both_required_suites(self):
        self.completion_fixture()
        with patch.object(guard.subprocess, "run", return_value=subprocess.CompletedProcess([], 0)) as run:
            guard.stop(self.root)
        self.assertEqual(run.call_count, 2)
        self.assertEqual(run.call_args_list[0].args[0][:2], ["node", "--test"])
        self.assertIn("unittest", run.call_args_list[1].args[0])

    def test_stop_failure_is_not_bypassed_when_already_active(self):
        event = {"cwd": str(self.root), "hook_event_name": "Stop", "stop_hook_active": True}
        with patch.object(sys, "argv", [str(SCRIPT), "stop"]), patch.object(sys, "stdin", io.StringIO(json.dumps(event))), patch.object(sys, "stderr", io.StringIO()):
            with patch.object(guard, "stop", side_effect=guard.Blocked("Failed")):
                self.assertEqual(guard.main(), 2)

    def test_stop_failure_and_timeout_block(self):
        self.completion_fixture()
        with patch.object(guard.subprocess, "run", return_value=subprocess.CompletedProcess([], 1)):
            with self.assertRaises(guard.Blocked):
                guard.stop(self.root)
        with patch.object(guard.subprocess, "run", side_effect=subprocess.TimeoutExpired("tests", 500)):
            with self.assertRaises(subprocess.TimeoutExpired):
                guard.stop(self.root)

    @unittest.skipUnless(shutil.which("gitleaks"), "Gitleaks is not installed")
    def test_real_scanner_accepts_safe_text_and_blocks_synthetic_secret(self):
        guard.scan(self.root, b"const message = 'safe';")
        with self.assertRaises(guard.Blocked):
            guard.scan(self.root, ("api_token = '" + synthetic_secret() + "'").encode())

    @unittest.skipUnless(shutil.which("gitleaks"), "Gitleaks is not installed")
    def test_real_scanner_blocks_staged_secret_in_clean_worktree(self):
        self.stage("new.txt", "api_token = '" + synthetic_secret() + "'")
        (self.root / "new.txt").write_text("safe")
        with self.assertRaises(guard.Blocked):
            guard.scan(self.root, guard.source_snapshot(self.root))

    @unittest.skipUnless(shutil.which("gitleaks"), "Gitleaks is not installed")
    def test_real_scanner_blocks_staged_binary_secret(self):
        path = self.root / "binary.dat"
        path.write_bytes(b"\0api_token = '" + synthetic_secret().encode() + b"'\n")
        guard.git(self.root, "add", "binary.dat")
        path.write_text("safe")
        with self.assertRaises(guard.Blocked):
            guard.scan(self.root, guard.source_snapshot(self.root))

    @unittest.skipUnless(shutil.which("gitleaks"), "Gitleaks is not installed")
    def test_public_fixture_allowances_do_not_allow_other_tokens(self):
        guard.scan(self.root, b'api_key = "sk_live_abc123"\nIdempotency-Key: c24ee2bf-7eee-4b38-9bf1-e9b589bdb389')
        with self.assertRaises(guard.Blocked):
            guard.scan(self.root, ("api_token = '" + synthetic_secret() + "'").encode())

    def test_settings_wire_blocking_hooks_and_valid_examples(self):
        settings = json.loads((SCRIPT.parents[1] / "settings.json").read_text())
        pre = settings["hooks"]["PreToolUse"][0]
        self.assertEqual(pre["matcher"], ".*")
        self.assertEqual(pre["hooks"][0]["onFailure"], "block")
        denies = settings["permissions"]["deny"]
        self.assertLess(denies.index("Read(.env*)"), denies.index("Read(!.env.example)"))


if __name__ == "__main__":
    unittest.main()
