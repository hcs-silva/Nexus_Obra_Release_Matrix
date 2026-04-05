import { readFile, writeFile } from "node:fs/promises";
import process from "node:process";

const usage = () => {
  console.error(
    "Usage: node scripts/render-release-matrix.mjs --target <client|server> --source <path> [--out <path>]",
  );
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const parsed = { target: "", source: "", out: "" };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];

    if (arg === "--target") {
      parsed.target = next ?? "";
      index += 1;
      continue;
    }

    if (arg === "--source") {
      parsed.source = next ?? "";
      index += 1;
      continue;
    }

    if (arg === "--out") {
      parsed.out = next ?? "";
      index += 1;
      continue;
    }
  }

  return parsed;
};

const normalizeCell = (value) => (value == null ? "" : String(value));

const renderApprovedRowsForClient = (pairs) =>
  pairs
    .map(
      (pair) =>
        `| ${normalizeCell(pair.environment)} | ${normalizeCell(pair.clientTag)} | ${normalizeCell(pair.serverTag)} | ${normalizeCell(pair.approvedBy)} | ${normalizeCell(pair.date)} | ${normalizeCell(pair.notes)} |`,
    )
    .join("\n");

const renderApprovedRowsForServer = (pairs) =>
  pairs
    .map(
      (pair) =>
        `| ${normalizeCell(pair.environment)} | ${normalizeCell(pair.serverTag)} | ${normalizeCell(pair.clientTag)} | ${normalizeCell(pair.approvedBy)} | ${normalizeCell(pair.date)} | ${normalizeCell(pair.notes)} |`,
    )
    .join("\n");

const renderRollbackRowsForClient = (pairs) =>
  pairs
    .map(
      (pair) =>
        `| ${normalizeCell(pair.environment)} | ${normalizeCell(pair.previousClientTag)} | ${normalizeCell(pair.previousServerTag)} | ${normalizeCell(pair.triggerOrIncident)} | ${normalizeCell(pair.date)} |`,
    )
    .join("\n");

const renderRollbackRowsForServer = (pairs) =>
  pairs
    .map(
      (pair) =>
        `| ${normalizeCell(pair.environment)} | ${normalizeCell(pair.previousServerTag)} | ${normalizeCell(pair.previousClientTag)} | ${normalizeCell(pair.triggerOrIncident)} | ${normalizeCell(pair.date)} |`,
    )
    .join("\n");

const renderClientMatrix = (source) => `<!-- AUTO-GENERATED: run node scripts/sync-release-matrices.mjs -->

# Release Matrix

Track approved client↔server image tag pairs per environment.

Tag format:

- Client: \`client-vX.Y.Z\`
- Server: \`server-vX.Y.Z\`

## Current Approved Pairs

| Environment | Client Tag | Server Tag | Approved By | Date       | Notes |
| ----------- | ---------- | ---------- | ----------- | ---------- | ----- |
${renderApprovedRowsForClient(source.approvedPairs)}

## Rollback Pairs

| Environment | Previous Client Tag | Previous Server Tag | Trigger / Incident | Date       |
| ----------- | ------------------- | ------------------- | ------------------ | ---------- |
${renderRollbackRowsForClient(source.rollbackPairs)}

## Usage

1. Update \`release-matrix.json\` when promoting a release.
2. Run \`node scripts/sync-release-matrices.mjs\` to regenerate both matrix files.
3. Use \`node scripts/sync-release-matrices.mjs --check\` in CI to ensure both files are synced.
4. On incident, rollback both services to the previous approved pair.
`;

const renderServerMatrix = (source) => `<!-- AUTO-GENERATED: run node scripts/sync-release-matrices.mjs -->

# Release Matrix

Track approved server↔client image tag pairs per environment.

Tag format:

- Server: \`server-vX.Y.Z\`
- Client: \`client-vX.Y.Z\`

## Current Approved Pairs

| Environment | Server Tag | Client Tag | Approved By | Date       | Notes |
| ----------- | ---------- | ---------- | ----------- | ---------- | ----- |
${renderApprovedRowsForServer(source.approvedPairs)}

## Rollback Pairs

| Environment | Previous Server Tag | Previous Client Tag | Trigger / Incident | Date       |
| ----------- | ------------------- | ------------------- | ------------------ | ---------- |
${renderRollbackRowsForServer(source.rollbackPairs)}

## Usage

1. Update \`release-matrix.json\` when promoting a release.
2. Run \`node scripts/sync-release-matrices.mjs\` to regenerate both matrix files.
3. Use \`node scripts/sync-release-matrices.mjs --check\` in CI to ensure both files are synced.
4. Use tags created by Release Please release PR merges (do not manually create release tags).
5. On incident, rollback both services to the previous approved pair.
`;

const main = async () => {
  const args = parseArgs();

  if (!args.target || !args.source || !["client", "server"].includes(args.target)) {
    usage();
    process.exitCode = 1;
    return;
  }

  const source = JSON.parse(await readFile(args.source, "utf8"));
  const output = args.target === "client" ? renderClientMatrix(source) : renderServerMatrix(source);

  if (args.out) {
    await writeFile(args.out, output, "utf8");
  } else {
    process.stdout.write(output);
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
