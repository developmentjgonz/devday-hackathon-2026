"""Claude Code policy checks. Never execute the proposed tool command here."""

import json
import os
from pathlib import Path
import re
import shlex
import subprocess
import sys


# Exact public examples already in this repository, not credential patterns or
# ignored paths. New exceptions require review of this protected policy file.
SCANNER_CONFIG = """[extend]
useDefault = true

[[allowlists]]
description = "Public documentation placeholders and a fixed test idempotency ID"
regexTarget = "secret"
regexes = ['''^(?:YOUR_API_TOKEN|sk_live_abc123|c24ee2bf-7eee-4b38-9bf1-e9b589bdb389)$''']
"""


class Blocked(Exception):
    pass


def git(root, *args):
    return subprocess.check_output(
        ["git", *args], cwd=root, stderr=subprocess.DEVNULL, timeout=15,
    )


def project_root(cwd):
    return Path(git(cwd, "rev-parse", "--show-toplevel").decode().strip())


def strings(value):
    if isinstance(value, str):
        yield value
    elif isinstance(value, list):
        for item in value:
            yield from strings(item)
    elif isinstance(value, dict):
        for key, item in value.items():
            yield key
            yield from strings(item)


def proposed_content(tool, data):
    # Scan new edit content, so an edit can remove a secret without resending it.
    if tool == "Edit":
        return data["new_string"].encode()
    if tool == "MultiEdit":
        return "\n".join(edit["new_string"] for edit in data["edits"]).encode()
    return "\n".join(strings(data)).encode()


def scan(root, content):
    scanner_env = dict(os.environ)
    scanner_env.pop("GITLEAKS_CONFIG", None)
    scanner_env["GITLEAKS_CONFIG_TOML"] = SCANNER_CONFIG
    result = subprocess.run(
        [
            "gitleaks", "stdin", "--no-banner", "--redact",
            "--ignore-gitleaks-allow", "--gitleaks-ignore-path", "/dev/null",
            "--max-decode-depth", "3",
        ],
        input=content, cwd=root, env=scanner_env,
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=20,
    )
    if result.returncode:
        raise Blocked("Secret scan failed or found a secret. The action is blocked.")


def check_command(command):
    # Conservative token checks cover common wrappers, paths and flag order.
    # They are not a shell interpreter or an OS sandbox.
    tokens = shlex.split(command)
    programs = {Path(token).name for token in tokens}
    if "rm" in programs:
        raise Blocked("Removal commands are blocked by project policy.")
    if "git" in programs:
        if {"reset", "clean"} & set(tokens):
            raise Blocked("Git reset and clean are blocked by project policy.")
        force = any(
            token.startswith("--force")
            or re.fullmatch(r"-[A-Za-z]*f[A-Za-z]*", token)
            for token in tokens
        )
        if "push" in tokens and force:
            raise Blocked("Force pushes are blocked.")
    if "--remote" in tokens:
        if "seed-user-photos.mjs" in programs:
            raise Blocked("Remote seed execution is blocked.")
        if {"d1", "execute"} <= set(tokens):
            raise Blocked("Remote D1 execute is blocked. Use reviewed migrations.")
    if any(
        token == "--single-process" or token.startswith("--single-process=")
        or token == "--no-sandbox" or token.startswith("--no-sandbox=")
        or re.fullmatch(r"--disable-.*-sandbox(?:=.*)?", token)
        for token in tokens
    ):
        raise Blocked("Sandbox-disabling browser arguments are blocked.")


def source_snapshot(root):
    content = []
    names = set(git(
        root, "ls-files", "--cached", "--others", "--exclude-standard", "-z",
    ).split(b"\0"))
    for name in sorted(names - {b""}):
        path = root / os.fsdecode(name)
        # Git commits the link path, not the linked credential file's contents.
        if path.is_symlink():
            content.append(os.fsencode(os.readlink(path)))
        elif path.is_file():
            content.append(path.read_bytes())

    # Read complete indexed blobs, including binary content and unchanged
    # multiline context. A diff omits staged binary data and can miss secrets.
    blobs = set()
    for entry in git(root, "ls-files", "--stage", "-z").split(b"\0"):
        if not entry:
            continue
        metadata, _ = entry.split(b"\t", 1)
        mode, oid, stage = metadata.split()
        if stage != b"0":
            raise Blocked("The index has unresolved conflicts. Publishing is blocked.")
        if mode != b"160000":  # A submodule entry is a commit, not a file blob.
            blobs.add(oid)
    if blobs:
        result = subprocess.run(
            ["git", "cat-file", "--batch"], cwd=root,
            input=b"\n".join(sorted(blobs)) + b"\n",
            stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
            check=True, timeout=15,
        )
        content.append(result.stdout)
    return b"\n".join(content)


def pre_tool(root, event):
    tool = event["tool_name"]
    data = event["tool_input"]
    if tool == "Bash":
        check_command(data["command"])
    scan(root, proposed_content(tool, data))
    if tool == "Bash" and re.search(r"\b(commit|push|deploy)\b", data["command"]):
        scan(root, source_snapshot(root))


def stop(root):
    # Never pass a failed gate merely because stop_hook_active is true.
    # One shared deadline keeps failures below Claude's outer hook timeout.
    import time

    deadline = time.monotonic() + 500
    patterns = (
        "tests/auth/*.test.mjs", "tests/directory/*.test.mjs",
        "tests/workspace/*.test.mjs", "tests/unit/*.test.ts",
    )
    tests = []
    for pattern in patterns:
        matched = sorted(str(path.relative_to(root)) for path in root.glob(pattern))
        if not matched:
            raise Blocked("A required test group is missing. Completion is blocked.")
        tests.extend(matched)
    commands = [
        ["node", "--test", *tests],
        [sys.executable, "-B", "-m", "unittest", "discover", "-s", ".claude/hooks/tests", "-v"],
    ]
    if not (root / ".claude/hooks/tests/test_check.py").is_file():
        raise Blocked("Guard tests are missing. Completion is blocked.")
    for command in commands:
        result = subprocess.run(
            command, cwd=root, stdout=sys.stderr, stderr=sys.stderr,
            timeout=max(0.1, deadline - time.monotonic()),
        )
        if result.returncode:
            raise Blocked("Required tests failed. Do not report completion.")


def main():
    try:
        event = json.load(sys.stdin)
        root = project_root(event["cwd"])
        mode = sys.argv[1]
        if mode == "pre" and event["hook_event_name"] == "PreToolUse":
            pre_tool(root, event)
        elif mode == "stop" and event["hook_event_name"] == "Stop":
            stop(root)
        else:
            raise Blocked("Unknown guard mode or event. The action is blocked.")
    except Blocked as error:
        print(str(error), file=sys.stderr)
        return 2
    except Exception:
        # Tool input, scanner output and process errors can contain credentials.
        print("The project guard could not complete its check. The action is blocked.", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
