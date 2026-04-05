# Release Matrix Canonical Repo

This repository is the source of truth for client/server release compatibility pairs.

## Purpose

- Keep one canonical release matrix in JSON.
- Automatically open sync PRs in the Client and Server repos.
- Ensure rollback pairs stay matched across both repos.

## Files

- `release-matrix.json`: Canonical approved and rollback pairs.
- `scripts/render-release-matrix.mjs`: Renders markdown matrix for `client` or `server` perspective.
- `.github/workflows/publish-release-matrix-prs.yml`: Publishes sync PRs to target repos.

## Required GitHub Configuration

Set these in this canonical repository:

### Repository Variables

- `CLIENT_REPO`: `<org>/<client-repo>`
- `SERVER_REPO`: `<org>/<server-repo>`

Examples:

- `CLIENT_REPO=your-org/nexus-obra-client`
- `SERVER_REPO=your-org/nexus-obra-server`

### Repository Secret

- `CROSS_REPO_TOKEN`: Fine-grained token (or PAT) with write access to both target repos.

Minimum token permissions for target repos:

- Contents: Read and write
- Pull requests: Read and write
- Metadata: Read

## Branch Assumption

The workflow currently checks out and opens PRs against `main` in both target repos.

If one target uses `master`, update these fields in `.github/workflows/publish-release-matrix-prs.yml`:

- `ref: main`
- `base: main`

## How It Works

1. You update `release-matrix.json` in this canonical repo.
2. On push to `main`/`master`, the workflow runs.
3. It renders markdown for client and server.
4. It checks out each target repo.
5. It writes `RELEASE_MATRIX.md` in each repo.
6. It creates or updates PRs named `chore: sync release matrix`.

## Manual Run

You can trigger the workflow manually from GitHub Actions using `workflow_dispatch`.

## Local Validation

Render preview outputs locally:

```bash
node scripts/render-release-matrix.mjs --target client --source release-matrix.json --out RELEASE_MATRIX.client.preview.md
node scripts/render-release-matrix.mjs --target server --source release-matrix.json --out RELEASE_MATRIX.server.preview.md
```

## Data Contract

`release-matrix.json` must include:

- `approvedPairs[]` with keys: `environment`, `clientTag`, `serverTag`, `approvedBy`, `date`, `notes`
- `rollbackPairs[]` with keys: `environment`, `previousClientTag`, `previousServerTag`, `triggerOrIncident`, `date`

## Consumer Repo Requirements

Each target repo should keep its own sync-check workflow that validates `RELEASE_MATRIX.md` against canonical JSON.
This publisher workflow creates PRs, while consumer workflows enforce merge gates.
# Nexus_Obra_Release_Matrix
