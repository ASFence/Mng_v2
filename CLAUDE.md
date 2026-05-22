# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

복무관리 시스템 (Military Service Management System) — a mobile-first web app for logging QR code scans and GPS location records. It has two independently deployed components:

- **Backend**: `code.gs` — Google Apps Script web app (deployed from the Apps Script editor)
- **Frontend**: `index.template.html` — single-file SPA deployed to GitHub Pages via GitHub Actions

## Architecture

### Backend (`code.gs`)

Google Apps Script running as a web app. All configuration is stored in Apps Script **PropertiesService** (no hardcoded secrets). The Google Sheet acts as the database with four named sheets:

| Property key | Default sheet name | Purpose |
|---|---|---|
| `SHEET_RECORD` | `기록DB` | All scan/GPS records |
| `SHEET_DOOR` | `출입문DB` | QR code → location mapping |
| `SHEET_USERS` | `사용자DB` | Authorized user allowlist |
| `SHEET_AUDIT` | `감사로그` | Security audit trail |

API entry point is `doGet(e)`. All API calls go through `handleAPI()` which enforces token auth, action whitelist (`scanAndSave`, `saveRecord`, `getRecentRecords`), user authorization, and input sanitization before dispatching.

### Frontend (`index.template.html`)

Single HTML file with all CSS and JS inlined. Uses the [jsQR](https://github.com/cozmo/jsQR) library (CDN) for QR decoding. State is minimal globals (`liveScanning`, `liveStream`, `isSaving`, `locationConsent`). User name and location consent are persisted in `localStorage`.

`CONFIG.API_URL` and `CONFIG.API_TOKEN` are placeholder strings (`__API_URL__`, `__API_TOKEN__`) — they are **never real values in the template**.

### Build / Deploy pipeline

`deploy.yml` runs on push to `main`:
1. `sed` replaces `__API_URL__` and `__API_TOKEN__` with GitHub Secrets (`APPS_SCRIPT_URL`, `API_TOKEN`)
2. Generates `index.html` (gitignored — contains live secrets)
3. Deploys to GitHub Pages

**`index.html` must never be committed** — it is in `.gitignore`.

## Setup

### Backend (first-time)

1. Paste `code.gs` into a new Google Apps Script project linked to your Google Sheet.
2. Edit `initProperties()` — fill in `SPREADSHEET_ID`, `API_TOKEN` (32+ random chars), and `ALLOWED_ORIGINS`.
3. Run `initProperties()` once from the Apps Script editor.
4. Deploy as web app (Execute as: Me, Access: Anyone).

Useful debug functions runnable in the Apps Script editor:
- `checkProperties()` — shows current config (token masked)
- `debugSheets()` — lists sheets in the spreadsheet
- `updateProperty('KEY', 'value')` — update a single property

### Frontend (GitHub Actions)

Add two repository secrets under **Settings → Secrets and variables → Actions**:
- `APPS_SCRIPT_URL` — the deployed Apps Script web app URL
- `API_TOKEN` — must match the `API_TOKEN` set in Apps Script PropertiesService

Push to `main` to trigger deployment. The workflow validates that no placeholder strings remain in the built `index.html` and will fail the deploy if secrets were not injected.

### Local development

Create a local copy of the template with real values for testing — do **not** commit it:
```sh
sed -e "s|__API_URL__|YOUR_SCRIPT_URL|g" \
    -e "s|__API_TOKEN__|YOUR_TOKEN|g" \
    index.template.html > index.html
```
Open `index.html` directly in a browser (camera/GPS require HTTPS or localhost in most browsers).
