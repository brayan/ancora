export const PROTOCOL_VERSION = 1;
export const GENERAL_PROTOCOL_VERSION = 2;
export const RUNTIME_VERSION = '314.0.7';
export const MAX_SOURCE_LENGTH = 12_000;
export const MAX_OUTPUT_LENGTH = 8_000;
export const MAX_MESSAGE_LENGTH = 64_000;
export const BOOT_TIMEOUT_MS = 30_000;
export const RUN_TIMEOUT_MS = 2_000;

const bindingKeys = [
  'protocolVersion',
  'jobId',
  'revisionId',
  'sourceDigest',
  'casesDigest',
  'runtimeVersion',
];
const requestKeys = [...bindingKeys, 'type', 'source', 'cases', 'functionName', 'technique'];
const generalRequestKeys = requestKeys
  .filter((key) => key !== 'functionName')
  .concat('functionContract');
const resultKeys = [
  ...bindingKeys,
  'type',
  'cases',
  'technique',
  'output',
  'error',
  'loadMs',
  'executionMs',
];
const failureKeys = [...bindingKeys, 'type', 'code', 'output'];
const failureCodes = new Set([
  'bootstrap_error',
  'execution_error',
  'timeout',
  'stopped',
  'output_limit',
  'invalid_message',
]);
const techniqueResults = new Set(['passed', 'failed', 'inconclusive', 'not_required']);

function record(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    [Object.prototype, null].includes(Object.getPrototypeOf(value))
  );
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
  return typeof value === 'string' && /^[a-zA-Z0-9@_.:-]{1,100}$/.test(value);
}

function binding(value) {
  return (
    record(value) &&
    [PROTOCOL_VERSION, GENERAL_PROTOCOL_VERSION].includes(value.protocolVersion) &&
    identifier(value.jobId) &&
    identifier(value.revisionId) &&
    typeof value.sourceDigest === 'string' &&
    /^[a-f0-9]{64}$/.test(value.sourceDigest) &&
    typeof value.casesDigest === 'string' &&
    /^[a-f0-9]{64}$/.test(value.casesDigest) &&
    value.runtimeVersion === RUNTIME_VERSION
  );
}

function integerList(value) {
  return (
    Array.isArray(value) &&
    value.length <= 1_000 &&
    value.every((item) => Number.isSafeInteger(item) && Math.abs(item) <= 1_000_000)
  );
}

function pythonName(value) {
  return typeof value === 'string' && /^(?!__)[A-Za-z_][A-Za-z0-9_]{0,39}$/.test(value);
}

const pythonTypes = ['int', 'str', 'list[int]', 'list[str]', 'dict[str,int]', 'dict[str,str]'];

function functionContract(value) {
  return (
    keysMatch(value, ['name', 'parameter', 'returns']) &&
    pythonName(value.name) &&
    keysMatch(value.parameter, ['name', 'type']) &&
    pythonName(value.parameter.name) &&
    pythonTypes.includes(value.parameter.type) &&
    pythonTypes.includes(value.returns)
  );
}

function boundedInteger(value) {
  return Number.isSafeInteger(value) && Math.abs(value) <= 1_000_000;
}

function boundedString(value) {
  return typeof value === 'string' && value.length <= 2_000;
}

function typedValue(value, type) {
  if (type === 'int') {
    return boundedInteger(value);
  }
  if (type === 'str') {
    return boundedString(value);
  }

  const validItem = type.endsWith('int]') ? boundedInteger : boundedString;
  if (type.startsWith('list[')) {
    return Array.isArray(value) && value.length <= 100 && value.every(validItem);
  }
  return (
    record(value) &&
    Object.keys(value).length <= 100 &&
    Object.entries(value).every(([key, item]) => key.length <= 100 && validItem(item))
  );
}

function supportedValue(value) {
  return pythonTypes.some((type) => typedValue(value, type));
}

export function isRunRequest(value) {
  if (!boundedMessage(value) || !binding(value)) {
    return false;
  }

  const general = value.protocolVersion === GENERAL_PROTOCOL_VERSION;
  const validContract = general
    ? functionContract(value.functionContract)
    : value.functionName === 'positive_even';
  if (
    !keysMatch(value, general ? generalRequestKeys : requestKeys) ||
    !validContract ||
    value.type !== 'run' ||
    typeof value.source !== 'string' ||
    value.source.length === 0 ||
    value.source.length > MAX_SOURCE_LENGTH ||
    !(
      general
        ? ['list_comprehension', 'dict_comprehension', 'none']
        : ['list_comprehension', 'none']
    ).includes(value.technique) ||
    !Array.isArray(value.cases) ||
    value.cases.length === 0 ||
    value.cases.length > 12 ||
    new Set(value.cases.map((item) => item?.id)).size !== value.cases.length
  ) {
    return false;
  }

  return value.cases.every(
    (item) =>
      keysMatch(item, ['id', 'input', 'expected']) &&
      identifier(item.id) &&
      (general
        ? typedValue(item.input, value.functionContract.parameter.type) &&
          typedValue(item.expected, value.functionContract.returns)
        : integerList(item.input) && integerList(item.expected))
  );
}

export function isLoadedResponse(value) {
  return (
    boundedMessage(value) &&
    keysMatch(value, [...bindingKeys, 'type']) &&
    binding(value) &&
    value.type === 'loaded'
  );
}

export function parseRunnerResponse(value) {
  if (!boundedMessage(value) || !binding(value)) {
    return null;
  }

  if (
    keysMatch(value, failureKeys) &&
    value.type === 'failure' &&
    failureCodes.has(value.code) &&
    typeof value.output === 'string' &&
    value.output.length <= MAX_OUTPUT_LENGTH
  ) {
    return value;
  }

  if (!keysMatch(value, resultKeys) || value.type !== 'result') {
    return null;
  }
  if (
    !Array.isArray(value.cases) ||
    value.cases.length > 12 ||
    !techniqueResults.has(value.technique)
  ) {
    return null;
  }

  const hasValidCases = value.cases.every(
    (item) =>
      keysMatch(item, ['id', 'passed', 'actual', 'mutated']) &&
      identifier(item.id) &&
      typeof item.passed === 'boolean' &&
      typeof item.mutated === 'boolean' &&
      (item.actual === null ||
        (value.protocolVersion === GENERAL_PROTOCOL_VERSION
          ? supportedValue(item.actual)
          : integerList(item.actual)))
  );
  if (!hasValidCases) {
    return null;
  }

  if (
    typeof value.output !== 'string' ||
    value.output.length > MAX_OUTPUT_LENGTH ||
    !(value.error === null || (typeof value.error === 'string' && value.error.length <= 1_000))
  ) {
    return null;
  }

  const hasValidTimings = [value.loadMs, value.executionMs].every(
    (duration) => Number.isFinite(duration) && duration >= 0 && duration <= 120_000
  );
  if (!hasValidTimings) {
    return null;
  }

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
    response.type !== 'result' ||
    ((response.error === null
      ? response.cases.length === request.cases.length
      : response.cases.length <= request.cases.length) &&
      response.cases.every((item, index) => item.id === request.cases[index].id))
  );
}

export async function digestText(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function canonicalValue(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalValue);
  }
  if (record(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalValue(value[key])])
    );
  }
  return value;
}

export function casesDigestText(cases, functionContract) {
  return functionContract === undefined
    ? JSON.stringify(cases)
    : JSON.stringify({
        // Envelope properties are canonical; dictionary data keeps its wire enumeration order.
        cases: cases.map(({ id, input, expected }) => ({ expected, id, input })),
        functionContract: canonicalValue(functionContract),
      });
}
