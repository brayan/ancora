import { expect, test, type Page } from '@playwright/test';
import { sessionSchema } from '@ancora/schemas';

const headers = { Origin: 'http://127.0.0.1:3000' };

async function openChallenge(page: Page) {
  await page.goto('/practice');
  await expect(page.getByRole('button', { name: 'Generate challenge', exact: true })).toBeEnabled();
  await page.getByLabel('Concept', { exact: true }).selectOption('strings');
  await page.getByRole('button', { name: 'Generate challenge', exact: true }).click();
  const open = page.getByRole('button', { name: 'Open challenge', exact: true });
  await expect(open).toBeEnabled();
  await open.click();
  await expect(page.getByRole('button', { name: 'Challenge is open', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reveal solution', exact: true })).toBeVisible();
}

async function reveal(page: Page) {
  await page.getByRole('button', { name: 'Reveal solution', exact: true }).click();
  await page.getByRole('button', { name: 'Reveal and record assistance', exact: true }).click();
  await expect(page.getByLabel('Revealed reference code')).toBeVisible();
}

test.afterEach(async ({ request }) => {
  const response = await request.post('/api/practice/session', {
    headers,
    data: { apiVersion: 1, revisionId: 'synthetic-positive-even@1' },
  });
  expect(response.ok()).toBe(true);
});

test('should preserve the draft and assistance history when revealing then hiding and reloading a solution', async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  const failed: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });
  page.on('requestfailed', (request) => failed.push(request.url()));
  await openChallenge(page);
  const original = sessionSchema.parse(await (await request.get('/api/practice/session')).json());
  const source = '# Synthetic draft retained during reveal\n' + original.draft.source;
  await page.getByLabel('Python solution').fill(source);
  await expect(page.locator('#draft-status')).toHaveText('Draft saved to your local database.');
  await page.getByRole('button', { name: 'Run examples', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Run examples', exact: true })).toBeEnabled();
  const before = sessionSchema.parse(await (await request.get('/api/practice/session')).json());
  expect(before.latestAttempt?.solutionRevealed).toBe(false);
  expect(before.solutionRevealedAt).toBeNull();

  let revealRequests = 0;
  page.on('request', (request) => {
    if (request.url().endsWith('/api/practice/reference')) {
      ++revealRequests;
    }
  });
  await page.getByRole('button', { name: 'Reveal solution', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Reveal and record assistance', exact: true })
  ).toBeFocused();
  await page.getByRole('button', { name: 'Cancel reveal', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reveal solution', exact: true })).toBeFocused();
  expect(revealRequests).toBe(0);
  expect((await (await request.get('/api/practice/session')).json()).solutionRevealedAt).toBeNull();
  await expect(page.getByLabel('Revealed reference code')).toHaveCount(0);

  await reveal(page);
  await expect(page.getByLabel('Revealed reference code')).toBeFocused();
  await expect(page.getByLabel('Python solution')).toHaveValue(source);
  const revealed = sessionSchema.parse(await (await request.get('/api/practice/session')).json());
  expect(revealed.solutionRevealedAt).not.toBeNull();
  expect(revealed.latestAttempt).toEqual(before.latestAttempt);
  expect(revealed.draft.source).toBe(source);
  expect(revealed.challenge).not.toHaveProperty('referenceSource');
  await page.screenshot({ path: 'test-results/assistance-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true
  );
  await page.screenshot({ path: 'test-results/assistance-mobile.png', fullPage: true });

  await page.getByRole('button', { name: 'Run reference separately', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Results · Reference solution', exact: true })
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Hide solution', exact: true })).toBeEnabled();
  await expect(page.locator('.submittedSource')).toHaveCount(0);
  expect((await (await request.get('/api/practice/session')).json()).attempts).toHaveLength(1);
  await page.getByRole('button', { name: 'Hide solution', exact: true }).click();
  await expect(page.getByLabel('Revealed reference code')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Show revealed solution', exact: true })
  ).toBeFocused();
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Show revealed solution', exact: true })
  ).toBeEnabled();
  await expect(page.getByLabel('Revealed reference code')).toHaveCount(0);
  await expect(page.getByLabel('Python solution')).toHaveValue(source);
  await page.getByRole('button', { name: 'Check solution', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Check solution', exact: true })).toBeEnabled();
  const assisted = sessionSchema.parse(await (await request.get('/api/practice/session')).json());
  expect(assisted.solutionRevealedAt).toBe(revealed.solutionRevealedAt);
  expect(assisted.latestAttempt?.solutionRevealed).toBe(true);
  await expect(page.locator('.attemptAssistance').first()).toHaveText(
    'Reference revealed before submission'
  );
  await expect(page.locator('.attemptAssistance').last()).toHaveText(
    'No recorded reveal before submission'
  );

  await page.getByRole('button', { name: 'Show revealed solution', exact: true }).click();
  await expect(page.getByLabel('Revealed reference code')).toBeVisible();
  await page
    .getByLabel('Open a saved challenge', { exact: true })
    .selectOption('synthetic-positive-even@1');
  await expect(page.getByLabel('Revealed reference code')).toHaveCount(0);
  expect(errors).toEqual([]);
  expect(failed).toEqual([]);
});

test('should retain the first reveal when the response is lost before an explicit retry', async ({
  page,
  request,
}) => {
  await openChallenge(page);
  const source = await page.getByLabel('Python solution').inputValue();
  await page.route('**/api/practice/reference', async (route) => {
    const saved = await route.fetch();
    expect(saved.ok()).toBe(true);
    expect(saved.headers()['cache-control']).toBe('no-store');
    await route.abort();
  });
  await page.getByRole('button', { name: 'Reveal solution', exact: true }).click();
  await page.getByRole('button', { name: 'Reveal and record assistance', exact: true }).click();
  await expect(
    page.getByText('The solution could not open. Your draft is preserved. Retry to open it.')
  ).toBeVisible();
  await expect(page.getByLabel('Revealed reference code')).toHaveCount(0);
  await expect(page.getByLabel('Python solution')).toHaveValue(source);
  const first = (await (await request.get('/api/practice/session')).json()).solutionRevealedAt;
  expect(first).not.toBeNull();
  await page.unroute('**/api/practice/reference');
  await page.getByRole('button', { name: 'Reveal and record assistance', exact: true }).click();
  await expect(page.getByLabel('Revealed reference code')).toBeVisible();
  expect((await (await request.get('/api/practice/session')).json()).solutionRevealedAt).toBe(
    first
  );
});

test('should withhold the solution and preserve edits when the reveal endpoint is unavailable', async ({
  page,
  request,
}) => {
  await openChallenge(page);
  const source =
    '# Synthetic error-state draft\n' + (await page.getByLabel('Python solution').inputValue());
  await page.getByLabel('Python solution').fill(source);
  await page.route('**/api/practice/reference', (route) =>
    route.fulfill({ status: 503, json: { error: 'practice_unavailable' } })
  );
  await page.getByRole('button', { name: 'Reveal solution', exact: true }).click();
  await page.getByRole('button', { name: 'Reveal and record assistance', exact: true }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'The solution could not open.' })
  ).toBeVisible();
  await expect(page.getByLabel('Revealed reference code')).toHaveCount(0);
  await expect(page.getByLabel('Python solution')).toHaveValue(source);
  expect((await (await request.get('/api/practice/session')).json()).solutionRevealedAt).toBeNull();
  await page.unroute('**/api/practice/reference');
  await page.getByRole('button', { name: 'Reveal and record assistance', exact: true }).click();
  await expect(page.getByLabel('Revealed reference code')).toBeVisible();
});

test('should derive assistance from persisted state when a stale tab submits after another tab reveals', async ({
  page,
  browser,
  request,
}) => {
  await openChallenge(page);
  const context = await browser.newContext();
  const other = await context.newPage();
  try {
    await other.goto('/practice');
    await expect(other.getByRole('button', { name: 'Reveal solution', exact: true })).toBeVisible();
    await reveal(page);
    await other.getByRole('button', { name: 'Run examples', exact: true }).click();
    await expect(other.getByRole('button', { name: 'Run examples', exact: true })).toBeEnabled();
    const session = sessionSchema.parse(await (await request.get('/api/practice/session')).json());
    expect(session.latestAttempt?.solutionRevealed).toBe(true);
    await expect(other.locator('.attemptAssistance').first()).toHaveText(
      'Reference revealed before submission'
    );
  } finally {
    await context.close();
  }
});

test('should reject unauthorized origins and assistance fields when the reference endpoint is called', async ({
  page,
  request,
}) => {
  await openChallenge(page);
  const before = sessionSchema.parse(await (await request.get('/api/practice/session')).json());
  const data = { apiVersion: 1, revisionId: before.challenge.revisionId };
  for (const origin of ['', 'http://127.0.0.1:3001', 'https://untrusted.invalid']) {
    const response = await request.post('/api/practice/reference', {
      headers: { Origin: origin },
      data,
    });
    expect(response.status()).toBe(403);
    expect(await response.json()).not.toHaveProperty('request');
  }
  const forged = await request.post('/api/practice/reference', {
    headers,
    data: { ...data, solutionRevealedAt: null },
  });
  expect(forged.status()).toBe(400);
  expect(await forged.json()).not.toHaveProperty('request');
  expect((await (await request.get('/api/practice/session')).json()).solutionRevealedAt).toBeNull();
});
