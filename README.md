# Movie Extractor

A Node.js monorepo for searching and downloading movies/TV from multiple sources (Vidsrc, Moviebox, WCO, Anikai). The main app is a terminal UI (TUI) with download management and config profiles. The repo also includes a Chrome/Edge extension for capturing download request metadata during research.

## Requirements

- **Node.js** ≥ 20
- **npm** (workspaces are used at the repo root)

## Install

From the repository root:

```bash
npm install
```

This installs dependencies for all workspaces (`extractor`, `moviebox-api`, `extension`).

## Build & run

Build the extractor (TypeScript → `extractor/dist/`):

```bash
npm run build
```

### Terminal UI (main app)

```bash
npm run tui
```

This builds the extractor and starts the Ink-based TUI for search, source selection, and downloads.

### Config profiles

```bash
npm run config
```

Opens the config TUI. Profiles are stored under `~/.config/movie-download-cli/` (or the path set by `MOVIE_DOWNLOAD_CLI_CONFIG`).

### Tests

```bash
npm test
```

## Workspaces

| Path | Role |
|------|------|
| `extractor/` | Core library, CLI, TUI, and providers (vidsrc, moviebox, wco, anikai) |
| `moviebox-api/` | Moviebox API helper package |
| `extension/` | Browser extension that logs download metadata (see `extension/README.md`) |

Other folders (`moviebox/`, `vidsrc/`, `wco/`, `megaup/`, `research/`) hold research assets (HAR captures, reverse-engineering notes) and are not part of the npm workspaces.

## Optional: extractor CLI

After building, you can extract links from a Vidsrc download URL:

```bash
node extractor/dist/src/cli.js <dl.vidsrc-url>
```

Or, if the package bins are linked:

```bash
npx vidsrc-extractor <dl.vidsrc-url>
npx vidsrc-tui
npx vidsrc-config
```
