import { pastedSourceTextLimits } from "@ancora/shared-types";
import { SourceInputError } from "@/server/sources/errors";

export const MAX_PASTED_SOURCE_TEXT_CHARACTERS = pastedSourceTextLimits.maxCharacters;
const MAX_SOURCE_TITLE_CHARACTERS = 120;
const DEFAULT_SOURCE_TITLE = "Pasted source";

export type ParsedPastedSourceInput = Readonly<{
  title: string;
  text: string;
  textCharacterCount: number;
}>;

export function parsePastedSourceInput(input: { title?: unknown; text?: unknown }) {
  if (typeof input.text !== "string") {
    throw new SourceInputError("malformed_text", "Pasted source text must be a string.");
  }

  if (hasUnsupportedControlCharacter(input.text)) {
    throw new SourceInputError(
      "malformed_text",
      "Pasted source text contains unsupported control characters.",
    );
  }

  if (!input.text.trim()) {
    throw new SourceInputError("empty_text", "Paste source text before creating a source.");
  }

  if (input.text.length > MAX_PASTED_SOURCE_TEXT_CHARACTERS) {
    throw new SourceInputError(
      "text_too_long",
      `Pasted source text must be ${MAX_PASTED_SOURCE_TEXT_CHARACTERS} characters or fewer.`,
    );
  }

  return {
    title: normalizeSourceTitle(input.title),
    text: input.text,
    textCharacterCount: input.text.length,
  } satisfies ParsedPastedSourceInput;
}

function normalizeSourceTitle(title: unknown) {
  if (typeof title !== "string") {
    return DEFAULT_SOURCE_TITLE;
  }

  const normalized = title.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return DEFAULT_SOURCE_TITLE;
  }

  return normalized.slice(0, MAX_SOURCE_TITLE_CHARACTERS);
}

function hasUnsupportedControlCharacter(text: string) {
  return /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(text);
}
