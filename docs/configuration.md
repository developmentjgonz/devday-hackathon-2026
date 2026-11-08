# Administrator configuration

Active administrators can open **Configuration** in the workspace. The phone and email section saves an inbound number and email address. Calls, texts, and email are not connected to a receiving service. Saving these values does not activate a channel.

The AI section saves an OpenAI model name and API key. It does not validate the model or key with OpenAI, and no AI analysis runs yet. The public reporting section has no link or QR code because the public submission form does not exist. When that form is built, it must not require an account or identifying details. Do not publish a QR code until the destination works.

The configuration API requires an active administrator and same-origin writes. The OpenAI key is encrypted with AES-GCM before storage in D1. API responses contain only the key's status; they never return its value. Administrators can replace or remove it. The encryption key is a 32-byte base64 secret in the Worker's `CONFIG_ENCRYPTION_KEY` binding; it must not be committed or exposed as a `VITE_` variable. The API rejects key writes if secure storage is unavailable and accepts key writes only over HTTPS or local test sign-in.

## Local setup

`npm run dev:api` creates a random local encryption key when none is configured. It preserves existing environment values and uses `.dev.vars` if present; otherwise it adds the key to `.env.local`. When it generates a key, it keeps a local copy under `.wrangler/state/` for recovery. These locations are ignored by Git. Keep the key stable for as long as the local database contains encrypted keys. If a configured key already exists, the script leaves it unchanged. Restart a running local API after changing its environment.

## Deployment setup

Before administrators save an API key in a deployed environment, provide a unique random 32-byte base64 value as the Worker's `CONFIG_ENCRYPTION_KEY` secret. Use Cloudflare's [Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/) for the binding, rather than a checked-in variable. Preserve the secret across deployments and back it up securely. Changing or losing it makes stored API keys unreadable; an administrator must replace those keys. Configure each environment separately, and never reuse the local key in production.

Apply the D1 migrations before using the page. `npm run test:workspace` covers administrator access, encrypted storage, key replacement and removal, missing or changed encryption keys, and local setup. `tests/ui/configuration.spec.ts` covers the page's main states in Storybook.
