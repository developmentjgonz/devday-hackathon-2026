# Technical communication

Explain things in ASD-STE100 (Simplified Technical English). Use Karpathy's softer version: about 80% of the way to ASD-STE100, because the full standard is strict.

Reference: https://x.com/karpathy/status/2105819303471976479

# Application stage

This is a greenfield application with no users yet. For now, there are no backward compatibility requirements. Breaking changes are acceptable. Do not add compatibility layers, legacy support, or migration paths only to preserve earlier behavior. Prefer the simplest correct design for the current requirements.

# Local browser security

For local Chromium automation, use `/Users/admin/.local/bin/eday-secure-chrome` and Playwright `chromiumSandbox: true`. The launcher checks the browser security baseline and rejects sandbox-disabling flags. Playwright MCP/CLI defaults are in `/Users/admin/.config/eday-browser/playwright.json`; agent-browser has the same launcher configured globally. Direct Playwright library calls need explicit launch options. Do not reinstall or use the quarantined old bundled Chromium builds to work around launch failures. Use a patched browser with sandboxing enabled instead. These defaults are safeguards, not an OS-enforced isolation boundary.
