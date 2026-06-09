import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

test("should list scaffold lanes when home constants are loaded", async () => {
  const constants = await readFile(
    new URL("../features/home/constants.ts", import.meta.url),
    "utf8",
  );

  assert.match(constants, /Sources/);
  assert.match(constants, /Decks/);
  assert.match(constants, /Reviews/);
  assert.match(constants, /Evals/);
});
