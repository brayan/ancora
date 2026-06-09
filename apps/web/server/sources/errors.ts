import type { SourceErrorCode } from "@ancora/shared-types";

export type SourceInputErrorCode = "empty_text" | "malformed_text" | "text_too_long";

export class SourceInputError extends Error {
  readonly code: SourceInputErrorCode;

  constructor(code: SourceInputErrorCode, message: string) {
    super(message);
    this.name = "SourceInputError";
    this.code = code;
  }
}

export class DuplicateSourceError extends Error {
  readonly code = "duplicate_source" satisfies SourceErrorCode;

  constructor() {
    super("This pasted source already exists for the account.");
    this.name = "DuplicateSourceError";
  }
}
