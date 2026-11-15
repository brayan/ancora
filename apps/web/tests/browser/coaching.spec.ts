import { expect, test, type Page } from '@playwright/test';
import { sessionSchema, coachingStatusSchema } from '@ancora/schemas';
const origin = 'http://127.0.0.1:3000';
const headers = { Origin: origin };
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
}

async function savedAttempt(page: Page) {
  await page.getByRole('button', { name: 'Run examples', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Run examples', exact: true })).toBeEnabled();
  await expect(
    page.getByRole('button', { name: 'Review code sharing', exact: true })
  ).toBeEnabled();
}

test.afterEach(async ({ request }) => {
  const response = await request.post('/api/practice/session', {
    headers,
    data: { apiVersion: 1, revisionId: 'synthetic-positive-even@1' },
  });
  expect(response.ok()).toBe(true);
});

test('should share only the selected saved attempt after confirmation when the editor has newer unsent changes', async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  const failures: string[] = [];
  const posts: object[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });
  page.on('requestfailed', (value) => failures.push(value.url()));
  page.on('request', (value) => {
    if (value.method() === 'POST' && value.url().endsWith('/api/practice/coaching')) {
      posts.push(value.postDataJSON() as object);
    }
  });
  await openChallenge(page);
  await savedAttempt(page);
  const before = sessionSchema.parse(await (await request.get('/api/practice/session')).json());
  const selected = before.latestAttempt!;
  expect(selected.coachingAvailable).toBe(false);
  const newer = '# Synthetic editor changed after saved attempt\n' + before.draft.source;
  await page.getByLabel('Python solution').fill(newer);
  await expect(page.locator('#draft-status')).toHaveText('Draft saved to your local database.');
  await page.getByRole('button', { name: 'Review code sharing', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Share this saved code?' })).toBeVisible();
  await expect(page.locator('.coachingSource')).toHaveText(selected.source);
  expect(posts).toHaveLength(0);
  await page.getByRole('button', { name: 'Cancel code sharing' }).click();
  expect(posts).toHaveLength(0);
  await page.getByRole('button', { name: 'Review code sharing', exact: true }).click();
  const share = page.getByRole('button', {
    name: 'Share this saved code with OpenAI',
    exact: true,
  });
  await share.focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Feedback for this saved attempt' })
  ).toBeVisible();
  await expect(page.getByLabel('Saved coaching feedback')).toBeFocused();
  expect(posts).toHaveLength(1);
  expect(posts[0]).toMatchObject({ attemptId: selected.id, shareCode: true });
  expect(Object.keys(posts[0]).sort()).toEqual(
    ['apiVersion', 'id', 'attemptId', 'shareCode'].sort()
  );
  await expect(page.getByLabel('Python solution')).toHaveValue(newer);
  const original = await (await request.get(`/api/practice/attempts/${selected.id}`)).json();
  expect(original).toEqual(selected);

  await page.locator('.coachingPanel').screenshot({ path: 'test-results/coaching-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.coachingPanel').screenshot({ path: 'test-results/coaching-mobile.png' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true
  );
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Feedback for this saved attempt' })
  ).toBeVisible();
  expect(posts).toHaveLength(1);
  await page.getByRole('button', { name: 'Check solution', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Check solution', exact: true })).toBeEnabled();
  const after = sessionSchema.parse(await (await request.get('/api/practice/session')).json());
  expect(after.latestAttempt?.coachingAvailable).toBe(true);
  expect(after.attempts.find((attempt) => attempt.id === selected.id)?.coachingAvailable).toBe(
    false
  );
  await page.getByLabel('Saved attempt for coaching').selectOption(selected.id);
  await expect(
    page.getByRole('heading', { name: 'Feedback for this saved attempt' })
  ).toBeVisible();
  expect(errors).toEqual([]);
  expect(failures).toEqual([]);
});

test('should read the pending request without another dispatch when the page reloads during coaching', async ({
  page,
  request,
}) => {
  await openChallenge(page);
  await savedAttempt(page);
  const session = sessionSchema.parse(await (await request.get('/api/practice/session')).json());
  const attemptId = session.latestAttempt!.id;
  await page.getByRole('button', { name: 'Review code sharing', exact: true }).click();
  await page
    .getByRole('button', { name: 'Share this saved code with OpenAI', exact: true })
    .click();
  await expect(page.getByText('Requesting coaching…', { exact: false })).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Feedback for this saved attempt' })
  ).toBeVisible();
  const saved = coachingStatusSchema.parse(
    await (await request.get(`/api/practice/coaching?attemptId=${attemptId}`)).json()
  );
  expect(saved.coaching?.dispatches).toBe(1);
  expect(saved.coaching?.attemptId).toBe(attemptId);
});

test('should require sharing confirmation and application origin when the coaching API is called directly', async ({
  page,
  request,
}) => {
  await openChallenge(page);
  await savedAttempt(page);
  const session = sessionSchema.parse(await (await request.get('/api/practice/session')).json());
  const attemptId = session.latestAttempt!.id;
  const data = { apiVersion: 1, id: crypto.randomUUID(), attemptId, shareCode: true };
  for (const shareCode of [undefined, false, 'true']) {
    expect(
      (
        await request.post('/api/practice/coaching', { headers, data: { ...data, shareCode } })
      ).status()
    ).toBe(400);
  }
  expect(
    (
      await request.post('/api/practice/coaching', {
        headers,
        data: { ...data, source: 'synthetic-browser-override' },
      })
    ).status()
  ).toBe(400);
  for (const Origin of ['http://127.0.0.1:3001', 'https://example.invalid']) {
    expect(
      (await request.post('/api/practice/coaching', { headers: { Origin }, data })).status()
    ).toBe(403);
  }
  const state = coachingStatusSchema.parse(
    await (await request.get(`/api/practice/coaching?attemptId=${attemptId}`)).json()
  );
  expect(state.coaching).toBeNull();
});

test('should show saved feedback without dispatch when provider availability is disabled', async ({
  page,
  request,
}) => {
  await openChallenge(page);
  await savedAttempt(page);
  const session = sessionSchema.parse(await (await request.get('/api/practice/session')).json());
  const attemptId = session.latestAttempt!.id;
  const result = await request.post('/api/practice/coaching', {
    headers,
    data: { apiVersion: 1, id: crypto.randomUUID(), attemptId, shareCode: true },
  });
  expect(result.ok()).toBe(true);
  const stored = await (await request.get(`/api/practice/coaching?attemptId=${attemptId}`)).json();
  // Configuration projection only; persistence and dispatch are exercised above and in PostgreSQL tests.
  await page.route('**/api/practice/coaching?*', (route) =>
    route.fulfill({ json: { ...stored, available: false, model: null } })
  );
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Feedback for this saved attempt' })
  ).toBeVisible();
  await expect(page.getByText('Coaching is unavailable.', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Review code sharing', exact: true })).toHaveCount(
    0
  );
});

test('should show final retry disclosure without automatic resubmission when both coaching requests fail', async ({
  page,
  request,
}) => {
  await openChallenge(page);
  await savedAttempt(page);
  const session = sessionSchema.parse(await (await request.get('/api/practice/session')).json());
  const attemptId = session.latestAttempt!.id;
  let dispatches = 1;
  let calls = 0;
  const row = () => ({
    id: '00000000-0000-4000-8000-000000000001',
    attemptId,
    revisionId: session.challenge.revisionId,
    sourceDigest: 'a'.repeat(64),
    consentVersion: 'code-sharing-v1',
    sharedAt: new Date().toISOString(),
    state: 'interrupted',
    dispatches,
    feedback: null,
    model: null,
    error: 'provider_interrupted',
  });
  // Failure-state presentation is synthetic; real allowance transitions have PostgreSQL coverage.
  await page.route('**/api/practice/coaching?*', (route) =>
    route.fulfill({
      json: { apiVersion: 1, available: true, model: 'synthetic-offline', coaching: row() },
    })
  );
  await page.route('**/api/practice/coaching/*/retry', (route) => {
    calls++;
    expect(route.request().postDataJSON()).toEqual({ apiVersion: 1, shareCode: true });
    dispatches = 2;
    return route.fulfill({ json: row() });
  });
  await page.reload();
  await page.getByRole('button', { name: 'Review code sharing for retry' }).click();
  await expect(
    page.getByText('This retry sends the same saved source again', { exact: false })
  ).toBeVisible();
  expect(calls).toBe(0);
  await page.getByRole('button', { name: 'Share this saved code with OpenAI again' }).click();
  await expect(page.getByText('No coaching retries remain', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Review code sharing for retry' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Refresh saved coaching' }).click();
  expect(calls).toBe(1);
});
