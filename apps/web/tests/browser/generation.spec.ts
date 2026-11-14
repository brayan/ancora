import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import {
  generationStatusSchema,
  generationViewSchema,
  generatorOutputSchema,
  sessionSchema,
  type GenerationView,
} from '@ancora/schemas';
import syntheticArtifacts from '../../../../evals/programming-practice/generation-v1.synthetic.json' with { type: 'json' };
import { REFERENCE_CODE } from '../../server/programming-practice/fixture';

const origin = 'http://127.0.0.1:3000';
const fixedRevision = 'synthetic-positive-even@1';
const generationsPath = '/api/practice/generations';
const trustedHeaders = { Origin: origin };

function syntheticDraft(concept: 'strings' | 'dictionaries') {
  const fixture = syntheticArtifacts.fixtures.find(
    (item) => item.input.request.concept === concept
  );
  if (!fixture) {
    throw new Error('Missing canonical synthetic generation fixture');
  }
  return generatorOutputSchema.parse(fixture.output).draft;
}

async function currentGeneration(request: APIRequestContext) {
  const response = await request.get(generationsPath);
  expect(response.ok()).toBe(true);
  return generationStatusSchema.parse(await response.json()).generation;
}

async function restoreFixedChallenge(request: APIRequestContext) {
  expect((await request.get('/api/practice/session')).ok()).toBe(true);
  const response = await request.post('/api/practice/session', {
    headers: trustedHeaders,
    data: { apiVersion: 1, revisionId: fixedRevision },
  });
  expect(response.ok()).toBe(true);
  expect(sessionSchema.parse(await response.json()).challenge.revisionId).toBe(fixedRevision);
}

async function openGeneration(page: Page) {
  await page.goto('/practice');
  await expect(page.getByRole('button', { name: 'Generate challenge', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Check solution', exact: true })).toBeEnabled();
}

async function generate(page: Page, concept: 'strings' | 'dictionaries', preferences = '') {
  await page.getByLabel('Concept', { exact: true }).selectOption(concept);
  await page.getByLabel('Preferences (optional)', { exact: true }).fill(preferences);
  await page.getByRole('button', { name: 'Generate challenge', exact: true }).click();
}

async function saveDraft(page: Page, source: string) {
  await page.getByLabel('Python solution').fill(source);
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.locator('#draft-status')).toHaveText('Draft saved to your local database.');
}

async function expectReady(page: Page) {
  await expect(page.getByRole('button', { name: 'Open challenge', exact: true })).toBeEnabled();
  await expect(page.getByText('Model requests used: 1/2.', { exact: false })).toBeVisible();
}

test.beforeEach(async ({ request }) => {
  await restoreFixedChallenge(request);
});

test.afterEach(async ({ page, request }) => {
  await page.unrouteAll({ behavior: 'wait' });
  const latest = await currentGeneration(request);
  if (latest?.state === 'validating') {
    // Finish the real pending reference/report so this shared synthetic DB stays usable.
    await page.goto('/practice');
    const retry = page.getByRole('button', { name: 'Retry saving validation', exact: true });
    const resume = page.getByRole('button', { name: 'Resume validation', exact: true });
    await expect(retry.or(resume)).toBeEnabled();
    if (await retry.count()) {
      await retry.click();
    } else {
      await resume.click();
    }
    await expect.poll(async () => (await currentGeneration(request))?.state).not.toBe('validating');
  }
  await restoreFixedChallenge(request);
});

for (const concept of ['strings', 'dictionaries'] as const) {
  test(`should preserve the current draft when a validated ${concept} challenge awaits opening`, async ({
    page,
    request,
  }) => {
    const browserErrors: string[] = [];
    const failedRequests: string[] = [];
    page.on('pageerror', (error) => browserErrors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') {
        browserErrors.push(message.text());
      }
    });
    page.on('requestfailed', (request) => failedRequests.push(request.url()));
    await openGeneration(page);
    const draft = syntheticDraft(concept);
    const fixedSource = `# Synthetic retained ${concept} draft\n${REFERENCE_CODE}`;
    await saveDraft(page, fixedSource);
    await generate(page, concept);
    await expectReady(page);

    const saved = await currentGeneration(request);
    expect(saved).toMatchObject({ state: 'ready', dispatches: 1 });
    expect(saved?.revisionId).toBe(`${saved?.id}@1`);
    await expect(page.getByLabel('Python solution')).toHaveValue(fixedSource);
    const beforeOpen = sessionSchema.parse(
      await (await request.get('/api/practice/session')).json()
    );
    expect(beforeOpen.challenge.revisionId).toBe(fixedRevision);
    expect(beforeOpen.challenge).not.toHaveProperty('referenceSource');
    expect(beforeOpen.challenge).not.toHaveProperty('checkCases');

    await page.getByRole('button', { name: 'Open challenge', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: draft.title, exact: true, level: 1 })
    ).toBeVisible();
    await expect(page.getByLabel('Python solution')).toHaveValue(
      `def ${draft.functionContract.name}(value: ${draft.functionContract.parameter.type}) -> ${draft.functionContract.returns}:\n    pass\n`
    );
    await saveDraft(page, draft.referenceSource);
    await page.getByRole('button', { name: 'Check solution', exact: true }).click();
    await expect(page.getByText('5/5 cases passed', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Check solution', exact: true })).toBeEnabled();
    await page.reload();
    await expect(page.getByLabel('Python solution')).toHaveValue(draft.referenceSource);
    await expect(page.getByText('5/5 cases passed', { exact: true })).toBeVisible();
    expect(
      await page
        .locator('iframe[title="Isolated Python execution context"]')
        .getAttribute('sandbox')
    ).toBe('allow-scripts allow-same-origin');

    if (concept === 'strings') {
      await page
        .locator('.generationPanel')
        .screenshot({ path: 'test-results/generation-desktop.png' });
      await page.setViewportSize({ width: 390, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true
      );
      await expect(page.getByLabel('Open a saved challenge', { exact: true })).toBeVisible();
      await page
        .locator('.generationPanel')
        .screenshot({ path: 'test-results/generation-mobile.png' });
    }
    await page.getByLabel('Open a saved challenge', { exact: true }).selectOption(fixedRevision);
    await expect(page.getByLabel('Python solution')).toHaveValue(fixedSource);
    const reopened = sessionSchema.parse(await (await request.get('/api/practice/session')).json());
    expect(reopened.challenge.revisionId).toBe(fixedRevision);
    expect(reopened.draft.source).toBe(fixedSource);
    expect(browserErrors).toEqual([]);
    expect(failedRequests).toEqual([]);
  });
}

test('should retain each tab’s candidate, challenge and draft when another tab opens a generated revision', async ({
  page,
  request,
}) => {
  await openGeneration(page);
  const fixedSource = `# Synthetic cross-tab fixed draft\n${REFERENCE_CODE}`;
  await saveDraft(page, fixedSource);
  await generate(page, 'dictionaries');
  await expectReady(page);
  const ownGeneration = await currentGeneration(request);
  if (!ownGeneration) {
    throw new Error('Expected tab A’s ready dictionary generation');
  }
  await expect(page.locator('.generationState h3')).toHaveText(
    syntheticDraft('dictionaries').title
  );
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Keep the positive evens');
  await expect(page.getByLabel('Python solution')).toHaveValue(fixedSource);
  const other = await page.context().newPage();
  try {
    await openGeneration(other);
    await generate(other, 'strings');
    await expectReady(other);
    const generated = await currentGeneration(request);
    if (!generated?.revisionId) {
      throw new Error('Expected ready synthetic revision');
    }
    await other.getByRole('button', { name: 'Open challenge', exact: true }).click();
    await expect(other.getByRole('heading', { level: 1 })).toHaveText(
      syntheticDraft('strings').title
    );
    await saveDraft(other, syntheticDraft('strings').referenceSource);
    const globalSelection = sessionSchema.parse(
      await (await request.get('/api/practice/session')).json()
    );
    expect(globalSelection.challenge.revisionId).toBe(generated.revisionId);
    expect(await page.evaluate(() => sessionStorage.getItem('ancora:practice-revision:v1'))).toBe(
      fixedRevision
    );
    expect(await other.evaluate(() => sessionStorage.getItem('ancora:practice-revision:v1'))).toBe(
      generated.revisionId
    );

    const refreshed = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === `${generationsPath}/${ownGeneration.id}` &&
        response.request().method() === 'GET',
      { timeout: 10_000 }
    );
    await page.getByRole('button', { name: 'Refresh generation status', exact: true }).click();
    expect((await refreshed).ok()).toBe(true);
    await expect(page.locator('.generationState h3')).toHaveText(
      syntheticDraft('dictionaries').title
    );
    expect(
      await page.evaluate(() =>
        JSON.parse(sessionStorage.getItem('ancora:generation-selection:v1') ?? 'null')
      )
    ).toBe(ownGeneration.id);
    expect(
      await other.evaluate(() =>
        JSON.parse(sessionStorage.getItem('ancora:generation-selection:v1') ?? 'null')
      )
    ).toBe(generated.id);

    const refreshSelections: (string | null)[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.pathname === '/api/practice/session' && request.method() === 'GET') {
        refreshSelections.push(url.searchParams.get('revisionId'));
      }
    });
    for (const [index, action] of ['Run examples', 'Check solution'].entries()) {
      const persisted = page.waitForResponse(
        (response) =>
          /\/api\/practice\/attempts\/[^/]+\/result$/.test(new URL(response.url()).pathname) &&
          response.request().method() === 'POST',
        { timeout: 10_000 }
      );
      await page.getByRole('button', { name: action, exact: true }).click();
      expect((await persisted).ok()).toBe(true);
      await expect(
        page.getByText(`${index === 0 ? 2 : 6}/${index === 0 ? 2 : 6} cases passed`, {
          exact: true,
        })
      ).toBeVisible();
      await expect.poll(() => refreshSelections.length).toBeGreaterThanOrEqual((index + 1) * 2);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Keep the positive evens');
      await expect(page.getByLabel('Python solution')).toHaveValue(fixedSource);
      const fixedSession = sessionSchema.parse(
        await (
          await request.get(`/api/practice/session?revisionId=${encodeURIComponent(fixedRevision)}`)
        ).json()
      );
      expect(fixedSession.challenge.revisionId).toBe(fixedRevision);
      expect(fixedSession.latestAttempt).toMatchObject({
        revisionId: fixedRevision,
        source: fixedSource,
        mode: index === 0 ? 'examples' : 'check',
        report: { type: 'result' },
      });
      await expect(other.getByLabel('Python solution')).toHaveValue(
        syntheticDraft('strings').referenceSource
      );
    }

    await page.reload();
    await expect(page.locator('.generationState h3')).toHaveText(
      syntheticDraft('dictionaries').title
    );
    expect(
      await page.evaluate(() =>
        JSON.parse(sessionStorage.getItem('ancora:generation-selection:v1') ?? 'null')
      )
    ).toBe(ownGeneration.id);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Keep the positive evens');
    await expect(page.getByLabel('Python solution')).toHaveValue(fixedSource);
    await expect(page.getByText('6/6 cases passed', { exact: true })).toBeVisible();
    expect(refreshSelections.every((revisionId) => revisionId === fixedRevision)).toBe(true);
    expect(await page.evaluate(() => sessionStorage.getItem('ancora:practice-revision:v1'))).toBe(
      fixedRevision
    );
    await other.reload();
    await expect(other.locator('.generationState h3')).toHaveText(syntheticDraft('strings').title);
    expect(
      await other.evaluate(() =>
        JSON.parse(sessionStorage.getItem('ancora:generation-selection:v1') ?? 'null')
      )
    ).toBe(generated.id);
    await expect(other.getByRole('heading', { level: 1 })).toHaveText(
      syntheticDraft('strings').title
    );
    await expect(other.getByLabel('Python solution')).toHaveValue(
      syntheticDraft('strings').referenceSource
    );
    expect(
      sessionSchema.parse(await (await request.get('/api/practice/session')).json()).challenge
        .revisionId
    ).toBe(generated.revisionId);
  } finally {
    await other.close();
    await restoreFixedChallenge(request);
  }
});

test('should resume the committed candidate without another dispatch when the generation acknowledgment is lost', async ({
  page,
  request,
}) => {
  await openGeneration(page);
  const committed: GenerationView[] = [];
  let generationPosts = 0;
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === generationsPath && request.method() === 'POST') {
      generationPosts += 1;
    }
  });
  await page.route('**/api/practice/generations', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    const response = await route.fetch({
      headers: { ...route.request().headers(), origin },
      timeout: 10_000,
    });
    expect(response.ok()).toBe(true);
    committed.push(generationViewSchema.parse(await response.json()));
    await route.abort();
  });
  await generate(page, 'strings');
  await expect(
    page.getByRole('button', { name: 'Retry generation request', exact: true })
  ).toBeEnabled();
  expect(committed).toHaveLength(1);
  const candidate = committed[0];
  expect(candidate).toMatchObject({ state: 'validating', dispatches: 1 });
  await page.unroute('**/api/practice/generations');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Resume validation', exact: true })).toBeEnabled();
  expect(await currentGeneration(request)).toEqual(candidate);
  await expect(
    page.getByRole('button', { name: 'Retry generation request', exact: true })
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Resume validation', exact: true }).click();
  await expectReady(page);
  expect(await currentGeneration(request)).toMatchObject({
    id: candidate.id,
    dispatches: 1,
    state: 'ready',
  });
  expect(generationPosts).toBe(1);
});

test('should retry only the stored report when saving reference validation fails across reload', async ({
  page,
  request,
}) => {
  await openGeneration(page);
  const validationRequests: string[] = [];
  page.on('request', (request) => {
    if (/\/api\/practice\/generations\/[^/]+\/validation$/.test(new URL(request.url()).pathname)) {
      validationRequests.push(request.method());
    }
  });
  await page.route('**/api/practice/generations/*/validation', async (route) => {
    if (route.request().method() === 'POST') {
      await route.abort();
    } else {
      await route.continue();
    }
  });
  await generate(page, 'dictionaries');
  await expect(
    page.getByRole('button', { name: 'Retry saving validation', exact: true })
  ).toBeEnabled();
  const pending = await currentGeneration(request);
  expect(pending).toMatchObject({ state: 'validating', dispatches: 1 });
  const storage = await page.evaluate(() => ({
    validation: Object.keys(sessionStorage).filter((key) =>
      key.startsWith('ancora:generation-validation:v1:')
    ),
    attempts: Object.keys(localStorage).filter((key) =>
      key.startsWith('ancora:pending-result:v1:')
    ),
  }));
  expect(storage.validation).toEqual([`ancora:generation-validation:v1:${pending?.id}`]);
  expect(storage.attempts).toEqual([]);
  expect(validationRequests).toEqual(['GET', 'POST']);

  await page.unroute('**/api/practice/generations/*/validation');
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Retry saving validation', exact: true })
  ).toBeEnabled();
  await page.getByRole('button', { name: 'Retry saving validation', exact: true }).click();
  await expectReady(page);
  expect(validationRequests).toEqual(['GET', 'POST', 'POST']);
  expect(await currentGeneration(request)).toMatchObject({
    id: pending?.id,
    state: 'ready',
    dispatches: 1,
  });
  expect(
    await page.evaluate(() =>
      Object.keys(sessionStorage).filter((key) =>
        key.startsWith('ancora:generation-validation:v1:')
      )
    )
  ).toEqual([]);
});

test('should require an explicit correction and preserve the first candidate when its reference fails', async ({
  page,
  request,
}) => {
  await openGeneration(page);
  let providerActions = 0;
  page.on('request', (request) => {
    const path = new URL(request.url()).pathname;
    if (request.method() === 'POST' && (path === generationsPath || path.endsWith('/correction'))) {
      providerActions += 1;
    }
  });
  await generate(page, 'strings', 'synthetic-invalid-reference');
  const correction = page.getByRole('button', { name: 'Request one correction', exact: true });
  await expect(correction).toBeEnabled();
  const first = await currentGeneration(request);
  expect(first).toMatchObject({ state: 'correction_available', dispatches: 1 });
  if (!first) {
    throw new Error('Expected durable first generation');
  }
  const firstEnvelope = await (
    await request.get(`${generationsPath}/${first.id}/validation`)
  ).json();
  expect(firstEnvelope.request.revisionId).toBe(`${first.id}@1`);
  expect(firstEnvelope.report.cases.some((item: { passed: boolean }) => !item.passed)).toBe(true);
  expect(providerActions).toBe(1);
  await expect(page.getByRole('button', { name: 'Open challenge', exact: true })).toHaveCount(0);

  await correction.click();
  await expect(page.getByRole('button', { name: 'Open challenge', exact: true })).toBeEnabled();
  const corrected = await currentGeneration(request);
  expect(corrected).toMatchObject({
    id: first.id,
    revisionId: `${first.id}@2`,
    state: 'ready',
    dispatches: 2,
  });
  const nextEnvelope = await (
    await request.get(`${generationsPath}/${first.id}/validation`)
  ).json();
  expect(nextEnvelope.request.source).toBe(syntheticDraft('strings').referenceSource);
  expect(nextEnvelope.request.source).not.toBe(firstEnvelope.request.source);
  expect(nextEnvelope.request.jobId).not.toBe(firstEnvelope.request.jobId);
  const stale = await request.post(`${generationsPath}/${first.id}/validation`, {
    headers: trustedHeaders,
    data: {
      apiVersion: 1,
      revisionId: firstEnvelope.request.revisionId,
      report: firstEnvelope.report,
    },
  });
  expect(stale.status()).toBe(409);
  expect(
    (
      await request.post(`${generationsPath}/${first.id}/correction`, {
        headers: trustedHeaders,
        data: { apiVersion: 1 },
      })
    ).status()
  ).toBe(409);
  await expect(correction).toHaveCount(0);
  expect(providerActions).toBe(2);
  expect(await currentGeneration(request)).toEqual(corrected);
});

test('should reject generation requests when origins or contracts are unsupported', async ({
  request,
}) => {
  const before = await currentGeneration(request);
  const requestBody = {
    apiVersion: 1,
    id: crypto.randomUUID(),
    request: syntheticArtifacts.fixtures[0].input.request,
  };
  for (const foreignOrigin of ['http://127.0.0.1:3001', 'https://untrusted.invalid']) {
    expect(
      (
        await request.post(generationsPath, {
          headers: { Origin: foreignOrigin },
          data: requestBody,
        })
      ).status()
    ).toBe(403);
    expect(
      (await request.get(generationsPath, { headers: { Origin: foreignOrigin } })).status()
    ).toBe(403);
  }
  for (const unsupported of [
    { ...requestBody, apiVersion: 2 },
    { ...requestBody, request: { ...requestBody.request, language: 'javascript' } },
    { ...requestBody, provider: 'unselected' },
  ]) {
    expect(
      (await request.post(generationsPath, { headers: trustedHeaders, data: unsupported })).status()
    ).toBe(400);
  }
  const token = process.env.PRACTICE_SERVICE_TOKEN;
  expect(token?.length).toBeGreaterThanOrEqual(32);
  const pythonHeaders = { Authorization: `Bearer ${token}` };
  expect(
    (await request.get('http://127.0.0.1:8001/v1/status', { headers: pythonHeaders })).status()
  ).toBe(200);
  expect(
    (
      await request.get('http://127.0.0.1:8001/v1/status', {
        headers: { ...pythonHeaders, Origin: origin },
      })
    ).status()
  ).toBe(403);
  expect(
    (
      await request.post('http://127.0.0.1:8001/v1/generate', {
        headers: { ...pythonHeaders, Origin: 'http://127.0.0.1:3001' },
        data: syntheticArtifacts.fixtures[0].input,
      })
    ).status()
  ).toBe(403);
  expect(await currentGeneration(request)).toEqual(before);
});
