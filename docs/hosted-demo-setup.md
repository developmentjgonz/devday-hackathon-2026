# Dedicated synthetic Cloudflare demo

Status: deployment attempted November 8, 2026, blocked by D1 authorization. The existing release was not changed. Do not present the planned demo address as a live deployment.

After the user approved and configured both API secrets, the [deployment retry](https://github.com/developmentjgonz/devday-hackathon-2026/actions/runs/42492341290) reached the dedicated deploy step with all four encrypted configuration secrets available. Cloudflare again rejected D1 listing with `10000: Authentication error`. No dedicated D1, R2, or Worker resource was created. Key-sharing approval is resolved; Cloudflare account authorization remains the blocker.

## Required account access

The current GitHub Actions credential authenticates to Workers, but Cloudflare rejected D1 listing with error `10000`. The Cloudflare account owner must check that the token targets the account in `wrangler.jsonc` and can manage D1 databases, Workers R2 storage, and Worker scripts, with any account-read permission Wrangler requires. An account token that can deploy the original Hello Worker is not sufficient evidence of D1/R2 management access.

Store the corrected token as the existing repository Actions secret `CLOUDFLARE_API_TOKEN`. Do not paste it into chat, code, a workflow argument, or a committed file. The [Cloudflare D1 guide](https://developers.cloudflare.com/d1/get-started/) describes database setup and bindings; the [R2 create-bucket API](https://developers.cloudflare.com/api/resources/r2/subresources/buckets/methods/create/) documents its account authorization requirements.

## Already prepared

- Separate Worker: `devday-js-2026-mews-demo`.
- Separate D1: `mews-synthetic-demo-db`.
- Private R2: `mews-synthetic-demo-photos`, bound as `PHOTOS`; no public bucket access is enabled.
- All application migrations, an idempotent 112-report synthetic seed, and actual-record census refresh.
- Four high-entropy demo-account verifiers in encrypted `MEWS_DEMO_USERS_JSON`. Their plaintext access codes stay in the user's private local access document and are not committed or uploaded.
- With the user's explicit approval on November 8, 2026, the supplied keys are now stored as encrypted repository Actions secrets `MEWS_OPENAI_API_KEY` and `MEWS_GOOGLE_MAPS_BROWSER_KEY`. Their values were passed through stdin, were not printed, and are not committed. The deployment workflow installs them as Worker secrets after provisioning and deployment succeed. They are not yet verified on a hosted Worker because D1 authorization remains a separate blocker.

## Retry the tested branch

Run these commands only after the account owner updates the deployment credential:

```sh
gh auth status
gh workflow run cloudflare.yml \
  --repo developmentjgonz/devday-hackathon-2026 \
  --ref feat/mangrove-mews-field-ops \
  -f deploy_demo=true
gh run list \
  --repo developmentjgonz/devday-hackathon-2026 \
  --workflow cloudflare.yml \
  --branch feat/mangrove-mews-field-ops --limit 1
```

The workflow builds, checks the synthetic tests/Storybook/Worker bundle, verifies Cloudflare authentication, provisions only the dedicated resources, applies migrations, imports the seed, and deploys the app. It uses the returned account subdomain to set `APP_ORIGIN` and prints the final URL only after health/public-census checks succeed.

The workflow does not automatically merge into `main` or `release`. Re-running its seed preserves existing source IDs, human merges, completed work, and account verifiers.

## Required verification after successful publication

1. Open the returned URL; use the private hosted access document, **not** the local demo password.
2. Sign in as admin and verify the stored census and all five new tools. Verify sponsor/public denial of private routes.
3. Upload a fictional image, refresh its metadata, approve it, and reload its protected preview to exercise R2 write/read.
4. After the workflow installs the approved keys, compare the two Marmalade views and check the saved `agent` mode; enable Maps JavaScript API/billing and restrict its browser key to the new hosted origin as well as local testing origins.
5. Restart/reopen on another device to verify hosted persistence. Record the results before describing D1/R2 as fully verified.
