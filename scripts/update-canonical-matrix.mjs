import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const args = process.argv.slice(2);

const getArg = (name) => {
  const index = args.indexOf(name);
  if (index === -1 || index + 1 >= args.length) return undefined;
  return args[index + 1];
};

const fail = (message) => {
  console.error(`ERROR: ${message}`);
  process.exit(1);
};

const component = getArg("--component");
const tag = getArg("--tag");
const environment = getArg("--environment") || "dev";
const approvedBy = getArg("--approved-by") || "release-automation";
const notes = getArg("--notes") || "";
const sourcePath = getArg("--source") || "release-matrix.json";

if (!component || !["client", "server"].includes(component)) {
  fail("Missing or invalid --component. Use 'client' or 'server'.");
}

if (!tag) {
  fail("Missing required --tag argument.");
}

const tagPattern =
  component === "client"
    ? /^client-v\d+\.\d+\.\d+$/
    : /^server-v\d+\.\d+\.\d+$/;

if (!tagPattern.test(tag)) {
  fail(
    `Tag '${tag}' does not match expected format for component '${component}'.`,
  );
}

const today = new Date().toISOString().slice(0, 10);

const main = async () => {
  const absoluteSourcePath = path.resolve(process.cwd(), sourcePath);
  const raw = await readFile(absoluteSourcePath, "utf8");
  const matrix = JSON.parse(raw);

  if (!Array.isArray(matrix.approvedPairs)) {
    fail("Invalid release-matrix.json: approvedPairs must be an array.");
  }

  const envRow = matrix.approvedPairs.find(
    (pair) =>
      String(pair.environment).toLowerCase() === environment.toLowerCase(),
  );

  if (!envRow) {
    fail(`Environment '${environment}' was not found in approvedPairs.`);
  }

  const key = component === "client" ? "clientTag" : "serverTag";
  const previousValue = envRow[key] || "";

  if (previousValue === tag) {
    console.log(
      `No update required: ${component} tag is already '${tag}' for ${environment}.`,
    );
    return;
  }

  envRow[key] = tag;
  envRow.date = today;
  envRow.approvedBy = approvedBy;
  envRow.notes = notes;

  const output = `${JSON.stringify(matrix, null, 2)}\n`;
  await writeFile(absoluteSourcePath, output, "utf8");

  console.log(
    `Updated ${environment} approved pair: ${key} '${previousValue}' -> '${tag}' (${approvedBy}, ${today}).`,
  );
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
