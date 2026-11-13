import { createServer } from "node:http";
import { expect, test, type Page } from "@playwright/test";
import {
  CHECK_CASES,
  REFERENCE_CODE,
} from "../../features/programming-practice/constants";
import type { RunnerResponse } from "../../runner/protocol.mjs";

async function ready(page: Page) {
  await page.goto("/practice");
  await expect(
    page.getByRole("button", { name: "Check solution", exact: true }),
  ).toBeEnabled();
}

async function execute(
  page: Page,
  source: string,
  technique: "list_comprehension" | "none" = "list_comprehension",
  sourceDigestOverride: string | null = null,
): Promise<RunnerResponse> {
  return page.evaluate(
    async ({ source, cases, technique, sourceDigestOverride }) => {
      const frame = document.querySelector("iframe")!;
      const hash = async (text: string) =>
        Array.from(
          new Uint8Array(
            await crypto.subtle.digest(
              "SHA-256",
              new TextEncoder().encode(text),
            ),
          ),
          (byte) => byte.toString(16).padStart(2, "0"),
        ).join("");
      const jobId = crypto.randomUUID();
      const request = {
        type: "run",
        protocolVersion: 1,
        jobId,
        revisionId: "synthetic-positive-even@1",
        sourceDigest: sourceDigestOverride ?? (await hash(source)),
        casesDigest: await hash(JSON.stringify(cases)),
        runtimeVersion: "314.0.7",
        source,
        cases,
        functionName: "positive_even",
        technique,
      };
      return new Promise<RunnerResponse>((resolve, reject) => {
        const timer = setTimeout(() => {
          window.removeEventListener("message", receive);
          reject(new Error("Runner response deadline"));
        }, 40_000);
        function receive(event: MessageEvent) {
          if (
            event.origin !== "http://127.0.0.1:3001" ||
            event.source !== frame.contentWindow ||
            event.data?.jobId !== jobId ||
            !["result", "failure"].includes(event.data.type)
          )
            return;
          clearTimeout(timer);
          window.removeEventListener("message", receive);
          resolve(event.data);
        }
        window.addEventListener("message", receive);
        frame.contentWindow!.postMessage(request, "http://127.0.0.1:3001");
      });
    },
    { source, cases: CHECK_CASES, technique, sourceDigestOverride },
  );
}

function successful(response: RunnerResponse) {
  expect(response.type).toBe("result");
  if (response.type !== "result")
    throw new Error(`Runner failed: ${response.code}`);
  expect(response.error).toBeNull();
  expect(response.cases).toHaveLength(CHECK_CASES.length);
  return response;
}

test("should run the local practice UI without login when opened on desktop and mobile", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  const failed: string[] = [];
  page.on("requestfailed", (request) => failed.push(request.url()));
  await page.goto("/");
  await expect(page).toHaveURL(/\/practice$/);
  await expect(
    page.getByRole("button", { name: "Check solution", exact: true }),
  ).toBeEnabled();
  await page.getByLabel("Python solution").fill(REFERENCE_CODE);
  await page
    .getByRole("button", { name: "Check solution", exact: true })
    .click();
  await expect(
    page.getByText("6/6 cases passed", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("List comprehension verified", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/practice-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByLabel("Python solution")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByLabel("Python solution").focus();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Run examples", exact: true }),
  ).toBeFocused();
  await page.screenshot({
    path: "test-results/practice-mobile.png",
    fullPage: true,
  });
  await page
    .getByText("Runner spike tools and limits", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Run reference separately", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Results · Reference solution",
      exact: true,
    }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  expect(failed).toEqual([]);
});

test("should connect after cached reloads when iframe loading precedes hydration", async ({
  page,
}) => {
  await ready(page);
  for (let index = 0; index < 3; ++index) {
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Check solution", exact: true }),
    ).toBeEnabled();
  }
});

test("should mark technique inconclusive when the declared function is replaced", async ({
  page,
}) => {
  await ready(page);
  const report = successful(
    await execute(
      page,
      `${REFERENCE_CODE}\npositive_even = lambda values: list(filter(lambda x: x > 0 and x % 2 == 0, values))\n`,
    ),
  );
  expect(report.cases.every((item) => item.passed)).toBe(true);
  expect(report.technique).toBe("inconclusive");
});

test("should reject altered source digests when a valid envelope was tampered with", async ({
  page,
}) => {
  await ready(page);
  const report = await execute(
    page,
    REFERENCE_CODE,
    "list_comprehension",
    "0".repeat(64),
  );
  expect(report.type === "failure" && report.code).toBe("invalid_message");
  expect(
    successful(await execute(page, REFERENCE_CODE)).cases.every(
      (item) => item.passed,
    ),
  ).toBe(true);
});

test("should distinguish behavior from technique when functions are wrong or use unsupported patterns", async ({
  page,
}) => {
  await ready(page);
  const wrong = successful(
    await execute(page, "def positive_even(values):\n    return values\n"),
  );
  expect(wrong.cases.some((item) => !item.passed)).toBe(true);
  expect(wrong.technique).toBe("failed");
  const unrelated = successful(
    await execute(
      page,
      "def positive_even(values):\n    unused = [x for x in values]\n    return list(filter(lambda x: x > 0 and x % 2 == 0, values))\n",
    ),
  );
  expect(unrelated.cases.every((item) => item.passed)).toBe(true);
  expect(unrelated.technique).toBe("inconclusive");
  const mutation = successful(
    await execute(
      page,
      "def positive_even(values):\n    values.sort()\n    return [x for x in values if x > 0 and x % 2 == 0]\n",
    ),
  );
  expect(mutation.cases.some((item) => item.mutated && !item.passed)).toBe(
    true,
  );
  const error = await execute(
    page,
    "def positive_even(values):\n    raise ValueError('Synthetic failure')\n",
  );
  expect(error.type === "result" && error.error).toContain("ValueError");
});

test("should stop loops and cap output when execution exceeds limits then recover", async ({
  page,
}) => {
  await ready(page);
  const timeout = await execute(
    page,
    "def positive_even(values):\n    while True:\n        pass\n",
  );
  expect(timeout.type === "failure" && timeout.code).toBe("timeout");
  expect(
    successful(await execute(page, REFERENCE_CODE)).cases.every(
      (item) => item.passed,
    ),
  ).toBe(true);
  const output = await execute(
    page,
    "def positive_even(values):\n    print('x' * 20000)\n    return []\n",
  );
  expect(output.type === "failure" && output.code).toBe("output_limit");
  expect(output.output.length).toBeLessThanOrEqual(8_000);
  expect(
    successful(await execute(page, REFERENCE_CODE)).cases.every(
      (item) => item.passed,
    ),
  ).toBe(true);

  await page
    .getByLabel("Python solution")
    .fill("def positive_even(values):\n    while True:\n        pass\n");
  await page
    .getByRole("button", { name: "Check solution", exact: true })
    .click();
  await expect(
    page.getByText("Running your function…", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await expect(
    page.getByText(
      "Execution stopped. The next run starts with a fresh Python runtime.",
    ),
  ).toBeVisible();
  await page.getByLabel("Python solution").fill(REFERENCE_CODE);
  await page
    .getByRole("button", { name: "Check solution", exact: true })
    .click();
  await expect(
    page.getByText("6/6 cases passed", { exact: true }),
  ).toBeVisible();
});

test("should isolate reference and learner runs when code mutates runtime state", async ({
  page,
}) => {
  await ready(page);
  await execute(
    page,
    "import builtins\nbuiltins.synthetic_marker = True\ndef positive_even(values):\n    return []\n",
  );
  const clean = successful(
    await execute(
      page,
      "def positive_even(values):\n    import builtins\n    assert not hasattr(builtins, 'synthetic_marker')\n    return [x for x in values if x > 0 and x % 2 == 0]\n",
    ),
  );
  expect(clean.cases.every((item) => item.passed)).toBe(true);
  expect(successful(await execute(page, REFERENCE_CODE)).technique).toBe(
    "passed",
  );
});

test("should block application and external requests when Python accesses JavaScript", async ({
  page,
}) => {
  let privilegedCalls = 0;
  const canary = createServer((_request, response) => {
    ++privilegedCalls;
    response.writeHead(200, { "Access-Control-Allow-Origin": "*" }).end();
  });
  await new Promise<void>((resolve) => canary.listen(0, "127.0.0.1", resolve));
  const address = canary.address();
  if (!address || typeof address === "string")
    throw new Error("Missing canary address");
  try {
    await ready(page);
    // Synchronous XHR waits for rejection/response; CORS would allow the canary if CSP failed.
    const source = `def positive_even(values):\n    from js import fetch, XMLHttpRequest\n    from pyodide.ffi import create_once_callable\n    blocked = 0\n    for url in ['http://127.0.0.1:${address.port}/paid', 'http://127.0.0.1:3000/api/practice/generate', 'https://example.com/private']:\n        fetch(url).catch(create_once_callable(lambda error: None))\n        request = XMLHttpRequest.new()\n        request.open('GET', url, False)\n        try:\n            request.send()\n        except Exception:\n            blocked += 1\n        else:\n            raise AssertionError('Network request unexpectedly allowed')\n    assert blocked == 3\n    return [x for x in values if x > 0 and x % 2 == 0]\n`;
    const report = successful(await execute(page, source));
    expect(report.cases.every((item) => item.passed)).toBe(true);
    expect(privilegedCalls).toBe(0);
    const forged = await execute(
      page,
      "def positive_even(values):\n    from js import self\n    self.postMessage('generate-paid-challenge')\n    while True:\n        pass\n",
    );
    expect(forged.type === "failure" && forged.code).toBe("invalid_message");
    expect(privilegedCalls).toBe(0);
    expect(
      successful(await execute(page, REFERENCE_CODE)).cases.every(
        (item) => item.passed,
      ),
    ).toBe(true);
  } finally {
    await new Promise<void>((resolve, reject) =>
      canary.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test("should reject stale messages when a previous result arrives during a new run", async ({
  page,
}) => {
  await ready(page);
  const previous = successful(await execute(page, REFERENCE_CODE));
  await page
    .getByLabel("Python solution")
    .fill("def positive_even(values):\n    while True:\n        pass\n");
  await page
    .getByRole("button", { name: "Check solution", exact: true })
    .click();
  await page.evaluate((previous) => {
    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "http://127.0.0.1:3001",
        source: document.querySelector("iframe")!.contentWindow,
        data: previous,
      }),
    );
    window.dispatchEvent(
      new MessageEvent("message", {
        origin: "http://127.0.0.1:3001",
        source: document.querySelector("iframe")!.contentWindow,
        data: { type: "result", output: "x".repeat(100_000) },
      }),
    );
  }, previous);
  await expect(
    page.getByText(
      "Time limit reached (2 seconds). Check for an infinite loop and run again.",
    ),
  ).toBeVisible();
});

test("should keep the runner static and remove retired routes when probing HTTP boundaries", async ({
  request,
}) => {
  const origin = "http://127.0.0.1:3001";
  const worker = await request.get(`${origin}/worker.mjs`);
  expect(worker.status()).toBe(200);
  expect(worker.headers()["content-security-policy"]).toContain(
    "connect-src 'self'",
  );
  expect(
    (
      await request.post(`${origin}/worker.mjs`, { data: "synthetic" })
    ).status(),
  ).toBe(405);
  expect(
    (await request.get(`${origin}/config.mjs?private=synthetic`)).status(),
  ).toBe(404);
  expect((await request.get(`${origin}/package.json`)).status()).toBe(404);
  expect((await request.get(`${origin}/api/practice/generate`)).status()).toBe(
    404,
  );
  expect(
    (
      await request.get(`${origin}/`, {
        headers: { Host: "untrusted.invalid:3001" },
      })
    ).status(),
  ).toBe(403);
  for (const path of [
    "/sign-in",
    "/sign-up",
    "/decks",
    "/api/auth/session",
    "/api/sources",
    "/api/account/current",
  ])
    expect((await request.get(path)).status()).toBe(404);
});

test("should recover after bounded allocation when a fresh worker runs the next job", async ({
  page,
}) => {
  await ready(page);
  const measured = [];
  for (let index = 0; index < 3; ++index) {
    const report = successful(
      await execute(
        page,
        "def positive_even(values):\n    allocation = bytearray(16 * 1024 * 1024)\n    return [x for x in values if x > 0 and x % 2 == 0]\n",
      ),
    );
    expect(report.cases.every((item) => item.passed)).toBe(true);
    measured.push({
      loadMs: Math.round(report.loadMs),
      executionMs: Math.round(report.executionMs),
    });
  }
  console.log("Synthetic runner timings", JSON.stringify(measured));
  expect(
    successful(await execute(page, REFERENCE_CODE)).cases.every(
      (item) => item.passed,
    ),
  ).toBe(true);
});
