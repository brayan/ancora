import assert from "node:assert/strict";
import { test } from "node:test";

import { runSmoke } from "../dist/smoke.js";

test("smoke result is deterministic and synthetic", () => {
  assert.deepEqual(runSmoke(), {
    checks: [],
    dataset: "synthetic-empty",
    status: "ok",
    suite: "smoke",
  });
});
