import { expect, test, type Page } from '@playwright/test';
import { hintsSchema, sessionSchema } from '@ancora/schemas';

const origin = 'http://127.0.0.1:3000';
const headers = { Origin: origin };
const names = ['Conceptual nudge', 'Suggested approach', 'Pseudocode'];

async function openChallenge(page: Page) {
  await page.goto('/practice');
  const generate = page.getByRole('button', { name: 'Generate challenge', exact: true });
  await expect(generate).toBeEnabled();
  await page.getByLabel('Concept', { exact: true }).selectOption('collections');
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().endsWith('/api/practice/generations') &&
        response.request().method() === 'POST'
    ),
    generate.click(),
  ]);
  const open = page.getByRole('button', { name: 'Open challenge', exact: true });
  await expect(open).toBeEnabled();
  await open.click();
  await expect(page.getByRole('button', { name: 'Challenge is open', exact: true })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Get hint 1 · Conceptual nudge', exact: true })
  ).toBeEnabled();
}

async function getHint(page: Page, level: number) {
  const button = page.getByRole('button', {
    name: `Get hint ${level} · ${names[level - 1]}`,
    exact: true,
  });
  await expect(button).toBeEnabled();
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.hintContent')).toHaveCount(level);
  await expect(page.locator('.hintHistory li').last()).toBeFocused();
}

test.afterEach(async ({ request }) => {
  const response = await request.post('/api/practice/session', {
    headers,
    data: { apiVersion: 1, revisionId: 'synthetic-positive-even@1' },
  });
  expect(response.ok()).toBe(true);
});

test('should retain progressive hints and distinct assistance snapshots when requesting help then reloading and switching revisions', async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  const failed: string[] = [];
  const calls: object[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });
  page.on('requestfailed', (request) => failed.push(request.url()));
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/api/practice/hints')) {
      calls.push(request.postDataJSON() as object);
    }
  });
  await openChallenge(page);
  const original = sessionSchema.parse(await (await request.get('/api/practice/session')).json());
  const source = '# Synthetic draft preserved while hints are requested\n' + original.draft.source;
  await page.getByLabel('Python solution').fill(source);
  await expect(page.locator('#draft-status')).toHaveText('Draft saved to your local database.');
  await page.getByRole('button', { name: 'Run examples', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Run examples', exact: true })).toBeEnabled();
  const before = sessionSchema.parse(await (await request.get('/api/practice/session')).json());
  expect(before.latestAttempt?.hintLevel).toBe(0);

  await getHint(page, 1);
  await expect(page.getByLabel('Python solution')).toHaveValue(source);
  await page.getByRole('button', { name: 'Check solution', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Check solution', exact: true })).toBeEnabled();
  const assisted = sessionSchema.parse(await (await request.get('/api/practice/session')).json());
  expect(assisted.latestAttempt?.hintLevel).toBe(1);
  expect(assisted.latestAttempt?.solutionRevealed).toBe(false);
  await getHint(page, 2);
  await getHint(page, 3);
  await expect(page.getByText('All three hints are saved.', { exact: false })).toBeVisible();
  await page.locator('.hintsPanel').screenshot({ path: 'test-results/hints-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true
  );
  await page.locator('.hintsPanel').screenshot({ path: 'test-results/hints-mobile.png' });
  await page.reload();
  await expect(page.locator('.hintContent')).toHaveCount(3);
  await expect(page.getByLabel('Python solution')).toHaveValue(source);
  const after = sessionSchema.parse(await (await request.get('/api/practice/session')).json());
  expect(after.latestAttempt).toEqual(assisted.latestAttempt);
  await page.getByRole('button', { name: 'Check solution', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Check solution', exact: true })).toBeEnabled();
  await expect(page.locator('.attemptHintAssistance').first()).toHaveText(
    'Hint level 3 recorded before submission'
  );
  await expect(page.locator('.attemptHintAssistance').last()).toHaveText(
    'No recorded hints before submission'
  );
  await page
    .getByLabel('Open a saved challenge', { exact: true })
    .selectOption('synthetic-positive-even@1');
  await expect(page.locator('.hintContent')).toHaveCount(0);
  await page
    .getByLabel('Open a saved challenge', { exact: true })
    .selectOption(original.challenge.revisionId);
  await expect(page.locator('.hintContent')).toHaveCount(3);
  expect(calls).toHaveLength(3);
  for (const call of calls) {
    expect(Object.keys(call).sort()).toEqual(['apiVersion', 'id', 'level', 'revisionId']);
  }
  expect(errors).toEqual([]);
  expect(failed).toEqual([]);
});

test('should recover a saved hint without another dispatch when its response is lost', async ({
  page,
  request,
}) => {
  await openChallenge(page);
  let calls = 0;
  await page.route('**/api/practice/hints', async (route) => {
    ++calls;
    const saved = await route.fetch();
    expect(saved.ok()).toBe(true);
    expect(saved.headers()['cache-control']).toBe('no-store');
    await route.abort();
  });
  await page.getByRole('button', { name: 'Get hint 1 · Conceptual nudge', exact: true }).click();
  await expect(page.locator('.hintContent')).toHaveCount(1);
  await expect(
    page.getByText('Recovered the saved hint without another model call.')
  ).toBeVisible();
  await page.reload();
  await expect(page.locator('.hintContent')).toHaveCount(1);
  expect(calls).toBe(1);
  const session = sessionSchema.parse(await (await request.get('/api/practice/session')).json());
  const status = hintsSchema.parse(
    await (
      await request.get(
        `/api/practice/hints?revisionId=${encodeURIComponent(session.challenge.revisionId)}`
      )
    ).json()
  );
  expect(status.hints[0].dispatches).toBe(1);
});

test('should resume a saved pending request when the browser reloads during hint generation', async ({
  page,
  request,
}) => {
  await openChallenge(page);
  const session = sessionSchema.parse(await (await request.get('/api/practice/session')).json());
  let calls = 0;
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/api/practice/hints')) {
      ++calls;
    }
  });
  await page.getByRole('button', { name: 'Get hint 1 · Conceptual nudge', exact: true }).click();
  const status = async () =>
    hintsSchema.parse(
      await (
        await request.get(
          `/api/practice/hints?revisionId=${encodeURIComponent(session.challenge.revisionId)}`
        )
      ).json()
    );
  await expect.poll(async () => (await status()).hints[0]?.state).toBe('generating');
  await page.reload();
  await expect(page.locator('.hintContent')).toHaveCount(1);
  expect(calls).toBe(1);
  expect((await status()).hints[0].dispatches).toBe(1);
});

test('should preserve drafts and allow an explicit retry when the hint product endpoint is unavailable', async ({
  page,
}) => {
  await openChallenge(page);
  const source =
    '# Synthetic unavailable-hint draft\n' +
    (await page.getByLabel('Python solution').inputValue());
  await page.getByLabel('Python solution').fill(source);
  await page.route('**/api/practice/hints', (route) =>
    route.fulfill({ status: 503, json: { error: 'practice_unavailable' } })
  );
  await page.getByRole('button', { name: 'Get hint 1 · Conceptual nudge', exact: true }).click();
  await expect(
    page.getByText('The request could not be confirmed.', { exact: false })
  ).toBeVisible();
  await expect(page.getByLabel('Python solution')).toHaveValue(source);
  await expect(page.locator('.hintContent')).toHaveCount(0);
  await page.unroute('**/api/practice/hints');
  await getHint(page, 1);
});

test('should disable paid actions while keeping saved hints readable when provider availability changes', async ({
  page,
  request,
}) => {
  await openChallenge(page);
  await getHint(page, 1);
  const session = sessionSchema.parse(await (await request.get('/api/practice/session')).json());
  const saved = hintsSchema.parse(
    await (
      await request.get(
        `/api/practice/hints?revisionId=${encodeURIComponent(session.challenge.revisionId)}`
      )
    ).json()
  );
  await page.route('**/api/practice/hints?*', (route) =>
    route.fulfill({ json: { ...saved, available: false, model: null } })
  );
  await page.getByRole('button', { name: 'Refresh saved hints', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Get hint 2 · Suggested approach', exact: true })
  ).toBeDisabled();
  await expect(page.locator('.hintContent')).toHaveCount(1);
  await expect(page.getByText('Hint generation is unavailable.', { exact: false })).toBeVisible();
});

test('should reject origins and authority fields when untrusted requests target hint generation', async ({
  page,
  request,
}) => {
  await openChallenge(page);
  const session = sessionSchema.parse(await (await request.get('/api/practice/session')).json());
  const data = {
    apiVersion: 1,
    id: crypto.randomUUID(),
    revisionId: session.challenge.revisionId,
    level: 1,
  };
  for (const origin of ['', 'http://127.0.0.1:3001', 'https://untrusted.invalid']) {
    expect(
      (await request.post('/api/practice/hints', { headers: { Origin: origin }, data })).status()
    ).toBe(403);
  }
  for (const extra of [
    'source',
    'referenceSource',
    'challenge',
    'dispatches',
    'state',
    'accountId',
  ]) {
    const rejected = await request.post('/api/practice/hints', {
      headers,
      data: { ...data, [extra]: 'synthetic-untrusted' },
    });
    expect(rejected.status()).toBe(400);
  }
  const saved = hintsSchema.parse(
    await (
      await request.get(`/api/practice/hints?revisionId=${encodeURIComponent(data.revisionId)}`)
    ).json()
  );
  expect(saved.hints).toHaveLength(0);
});

test('should expose one explicit retry and exhaustion when a saved hint failure is displayed', async ({
  page,
  request,
}) => {
  await openChallenge(page);
  await getHint(page, 1);
  const session = sessionSchema.parse(await (await request.get('/api/practice/session')).json());
  const saved = hintsSchema.parse(
    await (
      await request.get(
        `/api/practice/hints?revisionId=${encodeURIComponent(session.challenge.revisionId)}`
      )
    ).json()
  );
  // Project deterministic failure states into the UI; real transitions are covered by PostgreSQL tests.
  let projected = hintsSchema.parse({
    ...saved,
    hints: [
      { ...saved.hints[0], state: 'failed', content: null, model: null, error: 'hint_invalid' },
    ],
  });
  await page.route('**/api/practice/hints?*', (route) => route.fulfill({ json: projected }));
  let retries = 0;
  await page.route(`**/api/practice/hints/${saved.hints[0].id}/retry`, (route) => {
    ++retries;
    expect(route.request().postDataJSON()).toEqual({ apiVersion: 1 });
    projected = hintsSchema.parse({
      ...projected,
      hints: [
        {
          ...projected.hints[0],
          state: 'interrupted',
          dispatches: 2,
          error: 'provider_interrupted',
        },
      ],
    });
    return route.fulfill({ json: projected.hints[0] });
  });
  await page.getByRole('button', { name: 'Refresh saved hints', exact: true }).click();
  const retry = page.getByRole('button', {
    name: 'Retry hint 1 · one more model request',
    exact: true,
  });
  await expect(retry).toBeEnabled();
  await retry.click();
  await expect(
    page.getByText('No hint retries remain for this level.', { exact: false })
  ).toBeVisible();
  await expect(retry).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Get hint 2 · Suggested approach', exact: true })
  ).toHaveCount(0);
  expect(retries).toBe(1);
});
