export const PROTOCOL_VERSION = 1;
export const RUNTIME_VERSION = "314.0.7";
export const MAX_SOURCE_LENGTH = 12_000;
export const MAX_OUTPUT_LENGTH = 8_000;
export const MAX_MESSAGE_LENGTH = 64_000;
export const BOOT_TIMEOUT_MS = 30_000;
export const RUN_TIMEOUT_MS = 2_000;

const bindingKeys = [
  "protocolVersion",
  "jobId",
  "revisionId",
  "sourceDigest",
  "casesDigest",
  "runtimeVersion",
];
const requestKeys = [
  ...bindingKeys,
  "type",
  "source",
  "cases",
  "functionName",
  "technique",
];
const resultKeys = [
  ...bindingKeys,
  "type",
  "cases",
  "technique",
  "output",
  "error",
  "loadMs",
  "executionMs",
];
const failureKeys = [...bindingKeys, "type", "code", "output"];
const failureCodes = new Set([
  "bootstrap_error",
  "execution_error",
  "timeout",
  "stopped",
  "output_limit",
  "invalid_message",
]);
const techniqueResults = new Set([
  "passed",
  "failed",
  "inconclusive",
  "not_required",
]);

function record(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function keysMatch(value, allowed) {
  return (
    record(value) &&
    Object.keys(value).length === allowed.length &&
    Object.keys(value).every((key) => allowed.includes(key))
  );
}

function boundedMessage(value) {
  try {
    return record(value) && JSON.stringify(value).length <= MAX_MESSAGE_LENGTH;
  } catch {
    return false;
  }
}

function identifier(value) {
  return typeof value === "string" && /^[a-zA-Z0-9@_.:-]{1,100}$/.test(value);
}

function binding(value) {
  return (
    record(value) &&
    value.protocolVersion === PROTOCOL_VERSION &&
    identifier(value.jobId) &&
    identifier(value.revisionId) &&
    typeof value.sourceDigest === "string" &&
    /^[a-f0-9]{64}$/.test(value.sourceDigest) &&
    typeof value.casesDigest === "string" &&
    /^[a-f0-9]{64}$/.test(value.casesDigest) &&
    value.runtimeVersion === RUNTIME_VERSION
  );
}

function integerList(value) {
  return (
    Array.isArray(value) &&
    value.length <= 1_000 &&
    value.every(
      (item) => Number.isSafeInteger(item) && Math.abs(item) <= 1_000_000,
    )
  );
}

export function isRunRequest(value) {
  return (
    boundedMessage(value) &&
    keysMatch(value, requestKeys) &&
    binding(value) &&
    value.type === "run" &&
    typeof value.source === "string" &&
    value.source.length > 0 &&
    value.source.length <= MAX_SOURCE_LENGTH &&
    value.functionName === "positive_even" &&
    ["list_comprehension", "none"].includes(value.technique) &&
    Array.isArray(value.cases) &&
    value.cases.length > 0 &&
    value.cases.length <= 12 &&
    new Set(value.cases.map((item) => item?.id)).size === value.cases.length &&
    value.cases.every(
      (item) =>
        keysMatch(item, ["id", "input", "expected"]) &&
        identifier(item.id) &&
        integerList(item.input) &&
        integerList(item.expected),
    )
  );
}

export function isLoadedResponse(value) {
  return (
    boundedMessage(value) &&
    keysMatch(value, [...bindingKeys, "type"]) &&
    binding(value) &&
    value.type === "loaded"
  );
}

export function parseRunnerResponse(value) {
  if (!boundedMessage(value) || !binding(value)) return null;
  if (
    keysMatch(value, failureKeys) &&
    value.type === "failure" &&
    failureCodes.has(value.code) &&
    typeof value.output === "string" &&
    value.output.length <= MAX_OUTPUT_LENGTH
  )
    return value;
  if (!keysMatch(value, resultKeys) || value.type !== "result") return null;
  if (
    !Array.isArray(value.cases) ||
    value.cases.length > 12 ||
    !techniqueResults.has(value.technique)
  )
    return null;
  if (
    !value.cases.every(
      (item) =>
        keysMatch(item, ["id", "passed", "actual", "mutated"]) &&
        identifier(item.id) &&
        typeof item.passed === "boolean" &&
        typeof item.mutated === "boolean" &&
        (item.actual === null || integerList(item.actual)),
    )
  )
    return null;
  if (
    typeof value.output !== "string" ||
    value.output.length > MAX_OUTPUT_LENGTH ||
    !(
      value.error === null ||
      (typeof value.error === "string" && value.error.length <= 1_000)
    )
  )
    return null;
  if (
    ![value.loadMs, value.executionMs].every(
      (duration) =>
        Number.isFinite(duration) && duration >= 0 && duration <= 120_000,
    )
  )
    return null;
  return value;
}

export function jobBinding(request) {
  return Object.fromEntries(bindingKeys.map((key) => [key, request[key]]));
}

export function matchesJob(response, request) {
  return bindingKeys.every((key) => response[key] === request[key]);
}

export function resultsMatchCases(response, request) {
  return (
    response.type !== "result" ||
    ((response.error === null
      ? response.cases.length === request.cases.length
      : response.cases.length <= request.cases.length) &&
      response.cases.every(
        (item, index) => item.id === request.cases[index].id,
      ))
  );
}

export async function digestText(text) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
