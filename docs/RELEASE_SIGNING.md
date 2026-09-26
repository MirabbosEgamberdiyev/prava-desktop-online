# Release signing & auto-update (audit P2-D2)

This covers the steps the repository owner has to perform personally, because they involve
private keys and paid certificates that must never be committed. The installer settings
that do not need secrets are already configured in `src-tauri/tauri.conf.json`:

- `bundle.windows.nsis.installMode = "currentUser"` (no admin/UAC prompt; installs to `%LOCALAPPDATA%`)
- `bundle.windows.nsis.languages = ["Uzbek", "Russian", "English"]` + `displayLanguageSelector: true`
- `bundle.windows.nsis.customLanguageFiles.Uzbek = "nsis/languages/Uzbek.nsh"` (Tauri ships no
  Uzbek strings for its own installer pages, NSIS itself does have `Uzbek.nlf`)

> The `.msi` (WiX) target is always per-machine. If you only want the no-admin installer,
> set `bundle.targets` to `["nsis"]` for Windows builds (or pass `--bundles nsis` in CI).

Never commit: `*.key`, `.pfx/.p12`, passwords, Azure client secrets. Put them in
GitHub → repo **Settings → Secrets and variables → Actions**.

---

## 1. Tauri updater (signed update bundles)

### 1.1 Generate the updater key pair (once)

```bash
npm run tauri signer generate -- -w ~/.tauri/prava-online.key
```

- Asks for a password (use a strong one, store it in your password manager).
- Produces `~/.tauri/prava-online.key` (PRIVATE — keep offline + backup) and
  `~/.tauri/prava-online.key.pub` (public — goes into `tauri.conf.json`).
- If the private key is lost, already-installed apps can never be updated again (users must
  reinstall manually), so back it up.

### 1.2 Add the plugin

```bash
npm i @tauri-apps/plugin-updater @tauri-apps/plugin-process
cd src-tauri
cargo add tauri-plugin-updater --target 'cfg(any(target_os = "macos", windows, target_os = "linux"))'
cargo add tauri-plugin-process
```

`src-tauri/src/lib.rs` (inside `run()` builder):

```rust
.plugin(tauri_plugin_updater::Builder::new().build())
.plugin(tauri_plugin_process::init())
```

`src-tauri/capabilities/main.json` → `permissions`: add `"updater:default"`, `"process:allow-restart"`.

### 1.3 Config (`src-tauri/tauri.conf.json`)

```jsonc
{
  "bundle": {
    "createUpdaterArtifacts": true
  },
  "plugins": {
    "updater": {
      // full CONTENT of prava-online.key.pub (not the path)
      "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6...",
      "endpoints": [
        "https://github.com/MirabbosEgamberdiyev/prava-desktop-online/releases/latest/download/latest.json"
      ],
      "windows": { "installMode": "passive" }
    }
  }
}
```

- `endpoints` may instead point at the backend (e.g. `https://pravaonline.uz/api/v1/public/app-releases/tauri/{{target}}/{{arch}}/{{current_version}}`)
  if you want the admin panel (`src/api/applicationService.ts` → `check-update`) to control rollouts;
  the endpoint must return the Tauri updater JSON (`version`, `notes`, `pub_date`, `platforms.<target>.{url,signature}`)
  or HTTP 204 when there is no update.
- `latest/download/...` only resolves for **published** releases. The workflow currently uses
  `releaseDraft: true`, so publish the draft after checking it.
- Add `https://github.com` / `https://objects.githubusercontent.com` (or your backend) to CSP `connect-src`
  only if you check for updates from the frontend with `fetch`; the plugin itself runs in Rust and is not
  subject to the WebView CSP.

Frontend check (e.g. on startup):

```ts
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
const update = await check();
if (update) { await update.downloadAndInstall(); await relaunch(); }
```

### 1.4 GitHub secrets for the updater

| Secret | Value |
|---|---|
| `TAURI_SIGNING_PRIVATE_KEY` | content of `~/.tauri/prava-online.key` (or its path on a self-hosted runner) |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | the password chosen in 1.1 |

`.github/workflows/build.yml`, step "Build Tauri app" → `env:`

```yaml
TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}
```

and under `with:` add `includeUpdaterJson: true` so `tauri-action` uploads `latest.json`.
With `createUpdaterArtifacts: true` the build **fails** if the key env vars are missing — that is intended.

---

## 2. Windows code signing (SmartScreen / antivirus reputation)

Unsigned `.exe` installers trigger "Windows protected your PC". Pick ONE option.

### Option A — Azure Trusted Signing (recommended, ~$10/month)

1. Azure portal → create a **Trusted Signing account** + **Certificate profile** (Public Trust).
   Identity validation of the organisation/individual is required (can take days).
2. Create an App registration (service principal) and give it the role
   **Trusted Signing Certificate Profile Signer** on the account.
3. CI: `cargo install trusted-signing-cli` (Windows job) and add secrets
   `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_TENANT_ID` to the build step `env:`.
4. `tauri.conf.json`:

```jsonc
"bundle": {
  "windows": {
    "signCommand": "trusted-signing-cli -e https://<region>.codesigning.azure.net -a <account-name> -c <certificate-profile> -d \"Prava Online\" %1"
  }
}
```

`%1` is replaced by Tauri with the file to sign (app exe, NSIS installer, updater bundle).

### Option B — OV (or EV) certificate from a CA

Since June 2023 CAs issue code-signing keys only on hardware (USB token / cloud HSM).

- **Cloud HSM** (DigiCert KeyLocker, SSL.com eSigner, Sectigo, …): use the vendor CLI via
  `bundle.windows.signCommand` exactly like Option A (`<vendor-tool> sign ... %1`).
- **Certificate in the Windows cert store** (self-hosted runner with the token plugged in, or a
  legacy `.pfx`):

```jsonc
"bundle": {
  "windows": {
    "certificateThumbprint": "A1B2C3...",      // Get-ChildItem Cert:\CurrentUser\My
    "digestAlgorithm": "sha256",
    "timestampUrl": "http://timestamp.digicert.com"
  }
}
```

  For a `.pfx` on GitHub-hosted runners: store it base64-encoded as `WINDOWS_CERTIFICATE` and its
  password as `WINDOWS_CERTIFICATE_PASSWORD`, then before the build step:

```powershell
$bytes = [Convert]::FromBase64String($env:WINDOWS_CERTIFICATE)
[IO.File]::WriteAllBytes("cert.pfx", $bytes)
Import-PfxCertificate -FilePath cert.pfx -CertStoreLocation Cert:\CurrentUser\My `
  -Password (ConvertTo-SecureString $env:WINDOWS_CERTIFICATE_PASSWORD -AsPlainText -Force)
Remove-Item cert.pfx
```

Note: EV certificates no longer give instant SmartScreen reputation (Microsoft changed this in
2024); reputation builds up with downloads for both OV and EV.

---

## 3. macOS signing + notarization

Requires a paid Apple Developer account. Create a **Developer ID Application** certificate,
export it (with private key) from Keychain as `.p12`.

| Secret | Value |
|---|---|
| `APPLE_CERTIFICATE` | `base64 -i cert.p12` output |
| `APPLE_CERTIFICATE_PASSWORD` | `.p12` export password |
| `APPLE_SIGNING_IDENTITY` | e.g. `Developer ID Application: Full Name (TEAMID)` |
| `KEYCHAIN_PASSWORD` | any random string (temporary CI keychain) |
| Notarization, option 1: `APPLE_ID`, `APPLE_PASSWORD` (app-specific password from appleid.apple.com), `APPLE_TEAM_ID` |
| Notarization, option 2 (App Store Connect API key): `APPLE_API_ISSUER`, `APPLE_API_KEY` (key id), `APPLE_API_KEY_PATH` (write the `.p8` from a secret to disk before the build) |

Pass them in the build step `env:`; the Tauri bundler imports `APPLE_CERTIFICATE` into a temporary
keychain, signs with `APPLE_SIGNING_IDENTITY` and notarizes/staples the `.app`/`.dmg` automatically.
`bundle.macOS.signingIdentity` can stay `null` when the env var is set.

---

## 4. Checklist before the first signed release

1. Updater keys generated + backed up; pubkey in `plugins.updater.pubkey`.
2. `TAURI_SIGNING_PRIVATE_KEY(_PASSWORD)` secrets set; `includeUpdaterJson: true`.
3. Windows signing configured (A or B); verify with `Get-AuthenticodeSignature .\Prava*.exe`.
4. macOS secrets set; verify with `spctl -a -vvv -t install Prava*.dmg`.
5. Bump `version` in `tauri.conf.json` + `package.json`, tag `vX.Y.Z`, publish the draft release.
