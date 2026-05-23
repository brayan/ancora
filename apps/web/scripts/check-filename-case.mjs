import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const roleRoots = ["components", "features"];
const componentFilePattern = /^[A-Z][A-Za-z0-9]*(?:\.test)?\.tsx$/;
const hookFilePattern = /^use[A-Z][A-Za-z0-9]*(?:\.test)?\.tsx?$/;
const canonicalFeatureFiles = new Set([
  "actions.ts",
  "constants.ts",
  "data.ts",
  "mappers.ts",
  "schemas.ts",
  "types.ts",
  "utils.ts",
]);

function collectFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return collectFiles(entryPath);
    }

    return entry.isFile() ? [entryPath] : [];
  });
}

function toRelativePath(filePath) {
  return path.relative(appRoot, filePath).split(path.sep).join("/");
}

function shouldCheckFile(filePath) {
  return /\.(ts|tsx)$/.test(filePath) && !filePath.includes("/node_modules/");
}

function validateFile(filePath) {
  const relativePath = toRelativePath(filePath);
  const fileName = path.basename(filePath);
  const pathParts = relativePath.split("/");

  if (pathParts.includes("sections")) {
    return `${relativePath}: use components instead of sections for UI folders.`;
  }

  if (canonicalFeatureFiles.has(fileName)) {
    return null;
  }

  if (pathParts.includes("hooks") || fileName.startsWith("use")) {
    return hookFilePattern.test(fileName)
      ? null
      : `${relativePath}: hook files must be camelCase and start with use.`;
  }

  if (pathParts.includes("components") && fileName.endsWith(".tsx")) {
    return componentFilePattern.test(fileName)
      ? null
      : `${relativePath}: React component files must be PascalCase.`;
  }

  return null;
}

const failures = roleRoots
  .map((root) => path.join(appRoot, root))
  .flatMap(collectFiles)
  .filter(shouldCheckFile)
  .map(validateFile)
  .filter(Boolean);

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}
