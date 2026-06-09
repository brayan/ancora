import { pastedSourceTextLimits } from "@ancora/shared-types";

export const sourcesEndpoint = "/api/sources";

export const sourceTextMaxLength = pastedSourceTextLimits.maxCharacters;

export const sourceErrorMessages: Record<string, string> = {
  duplicate_source: "That pasted source already exists in this account.",
  empty_text: "Paste source text before creating a source.",
  forbidden: "This account cannot access that source.",
  invalid_request: "Unable to read the pasted source.",
  malformed_text: "Pasted text contains unsupported control characters.",
  text_too_long: `Pasted text must be ${sourceTextMaxLength.toLocaleString()} characters or fewer.`,
  unauthorized: "Sign in before creating sources.",
};
