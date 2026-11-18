import { expect, test, type Page } from '@playwright/test';
import { REFERENCE_CODE } from '../../server/programming-practice/fixture';

async function open(page: Page) {
  await page.goto('/practice');
  await expect(page.getByRole('button', { name: 'Check solution', exact: true })).toBeEnabled();
}

async function save(page: Page, source: string) {
  await page.getByLabel('Python solution').fill(source);
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.locator('#draft-status')).toHaveText('Draft saved to your local database.');
}

test('should resume exact database drafts and immutable submissions when reopening without browser storage', async ({
  page,
  browser,
  request,
}) => {
  await open(page);
  const source = '# Synthetic persisted draft\n\n' + REFERENCE_CODE + '\n';
  await save(page, source);
  await page.getByRole('button', { name: 'Check solution', exact: true }).click();
  await expect(page.getByText('6/6 cases passed', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Check solution', exact: true })).toBeEnabled();
  const submitted = (await (await request.get('/api/practice/session')).json()).latestAttempt;
  expect(submitted.source).toBe(source);
  expect(submitted.report.type).toBe('result');

  await save(page, '# A newer synthetic draft\n' + REFERENCE_CODE);
  const context = await browser.newContext();
  const reopened = await context.newPage();
  try {
    await open(reopened);
    await expect(reopened.getByLabel('Python solution')).toHaveValue(
      '# A newer synthetic draft\n' + REFERENCE_CODE
    );
    await expect(reopened.getByText('6/6 cases passed', { exact: true })).toBeVisible();
    await reopened.getByText('Submitted code snapshot', { exact: true }).click();
    await expect(reopened.locator('.submittedSource pre')).toHaveText(source);
    await reopened.screenshot({ path: 'test-results/practice-resume.png', fullPage: true });
  } finally {
    await context.close();
  }
});

test('should recover unsaved edits when a failed draft save is followed by reload', async ({
  page,
  request,
}) => {
  await open(page);
  page.on('dialog', (dialog) => dialog.accept());
  await page.route('**/api/practice/draft', (route) => route.abort());
  const source = '# Synthetic offline recovery\n' + REFERENCE_CODE;
  await page.getByLabel('Python solution').fill(source);
  await expect(page.getByRole('button', { name: 'Retry save', exact: true })).toBeVisible();
  await expect(page.getByLabel('Python solution')).toHaveValue(source);

  await page.unroute('**/api/practice/draft');
  await page.reload();
  await expect(page.getByLabel('Python solution')).toHaveValue(source);
  await expect(page.locator('#draft-status')).toHaveText('Draft saved to your local database.');
  expect((await (await request.get('/api/practice/session')).json()).draft.source).toBe(source);
});

test('should preserve both drafts for an explicit choice when two tabs save the same version', async ({
  browser,
  request,
}) => {
  const first = await browser.newContext();
  const second = await browser.newContext();
  const a = await first.newPage();
  const b = await second.newPage();
  b.on('dialog', (dialog) => dialog.accept());
  try {
    await open(a);
    await open(b);
    await save(a, '# Synthetic first tab\n' + REFERENCE_CODE);
    const secondSource = '# Synthetic second tab\n' + REFERENCE_CODE;
    await b.getByLabel('Python solution').fill(secondSource);
    await expect(b.getByRole('button', { name: 'Keep my edits', exact: true })).toBeVisible();
    await expect(b.getByLabel('Python solution')).toHaveValue(secondSource);
    await expect(b.getByRole('button', { name: 'Check solution', exact: true })).toBeDisabled();

    await b.getByRole('button', { name: 'Keep my edits', exact: true }).click();
    await expect(b.locator('#draft-status')).toHaveText('Draft saved to your local database.');
    expect((await (await request.get('/api/practice/session')).json()).draft.source).toBe(
      secondSource
    );
    await expect(a.getByLabel('Python solution')).toHaveValue(
      '# Synthetic first tab\n' + REFERENCE_CODE
    );
  } finally {
    await first.close();
    await second.close();
  }
});

test('should preserve an unresolved recovery conflict when repeated reloads precede an explicit choice', async ({
  page,
  request,
}) => {
  await open(page);
  page.on('dialog', (dialog) => dialog.accept());
  const original = (await (await request.get('/api/practice/session')).json()).draft;
  await page.route('**/api/practice/draft', (route) => route.abort());
  const recoveredSource = '# Synthetic unresolved recovery\n' + REFERENCE_CODE;
  await page.getByLabel('Python solution').fill(recoveredSource);
  await expect(page.getByRole('button', { name: 'Retry save', exact: true })).toBeVisible();

  const databaseSource = '# Synthetic concurrent database draft\n' + REFERENCE_CODE;
  const saved = await request.put('/api/practice/draft', {
    headers: { Origin: 'http://127.0.0.1:3000' },
    data: { apiVersion: 1, ...original, source: databaseSource },
  });
  expect(saved.ok()).toBe(true);
  await page.unroute('**/api/practice/draft');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Keep my edits', exact: true })).toBeVisible();

  const editedSource = '# Synthetic edits during unresolved conflict\n' + REFERENCE_CODE;
  await page.getByLabel('Python solution').fill(editedSource);
  for (let reload = 0; reload < 2; ++reload) {
    await page.reload();
    await expect(page.getByRole('button', { name: 'Keep my edits', exact: true })).toBeVisible();
    await expect(page.getByLabel('Python solution')).toHaveValue(editedSource);
    await expect(page.getByRole('button', { name: 'Check solution', exact: true })).toBeDisabled();
    expect((await (await request.get('/api/practice/session')).json()).draft.source).toBe(
      databaseSource
    );
  }

  await page
    .locator('.editorPanel')
    .screenshot({ path: 'test-results/practice-conflict-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Use database draft', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page
    .locator('.editorPanel')
    .screenshot({ path: 'test-results/practice-conflict-mobile.png' });

  await page.getByRole('button', { name: 'Keep my edits', exact: true }).click();
  await expect(page.locator('#draft-status')).toHaveText('Draft saved to your local database.');
  expect((await (await request.get('/api/practice/session')).json()).draft.source).toBe(
    editedSource
  );
});

test('should retain independent unsaved recoveries when another tab saves in the same browser', async ({
  browser,
  request,
}) => {
  const context = await browser.newContext();
  const a = await context.newPage();
  const b = await context.newPage();
  a.on('dialog', (dialog) => dialog.accept());
  try {
    await open(a);
    await a.route('**/api/practice/draft', (route) => route.abort());
    const localSource = '# Synthetic first tab unsaved recovery\n' + REFERENCE_CODE;
    await a.getByLabel('Python solution').fill(localSource);
    await expect(a.getByRole('button', { name: 'Retry save', exact: true })).toBeVisible();

    await open(b);
    const databaseSource = '# Synthetic second tab acknowledged draft\n' + REFERENCE_CODE;
    await save(b, databaseSource);
    await a.unroute('**/api/practice/draft');
    await a.reload();

    await expect(a.getByLabel('Python solution')).toHaveValue(localSource);
    await expect(a.getByRole('button', { name: 'Keep my edits', exact: true })).toBeVisible();
    await b.reload();
    await expect(b.getByLabel('Python solution')).toHaveValue(databaseSource);
    expect((await (await request.get('/api/practice/session')).json()).draft.source).toBe(
      databaseSource
    );

    await a.getByRole('button', { name: 'Use database draft', exact: true }).click();
    await a.reload();
    await expect(a.getByLabel('Python solution')).toHaveValue(databaseSource);
    await expect(a.getByRole('button', { name: 'Keep my edits', exact: true })).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test('should resume the latest database draft when another tab saves after local acknowledgment', async ({
  browser,
  request,
}) => {
  const context = await browser.newContext();
  const a = await context.newPage();
  const b = await context.newPage();
  try {
    await open(a);
    await open(b);
    const firstSource = '# Synthetic newer draft after opening\n' + REFERENCE_CODE;
    await save(b, firstSource);

    await a.reload();
    await expect(a.getByLabel('Python solution')).toHaveValue(firstSource);
    await expect(a.getByRole('button', { name: 'Keep my edits', exact: true })).toHaveCount(0);
    await save(a, '# Synthetic acknowledged local edits\n' + REFERENCE_CODE);
    await b.reload();
    const latestSource = '# Synthetic newer draft after acknowledgment\n' + REFERENCE_CODE;
    await save(b, latestSource);
    const acknowledged = (await (await request.get('/api/practice/session')).json()).draft;

    await a.reload();
    await expect(a.getByLabel('Python solution')).toHaveValue(latestSource);
    await expect(a.locator('#draft-status')).toHaveText('Draft saved to your local database.');
    await expect(a.getByRole('button', { name: 'Keep my edits', exact: true })).toHaveCount(0);
    expect((await (await request.get('/api/practice/session')).json()).draft).toEqual(acknowledged);
  } finally {
    await context.close();
  }
});

test('should preserve the final editor state when an undone save commits before its acknowledgment is lost', async ({
  page,
  request,
}) => {
  await open(page);
  page.on('dialog', (dialog) => dialog.accept());
  const originalSource = '# Synthetic acknowledged source before undo\n' + REFERENCE_CODE;
  await save(page, originalSource);
  let confirmCommit!: () => void;
  const committed = new Promise<void>((resolve) => (confirmCommit = resolve));
  let releaseResponse!: () => void;
  const released = new Promise<void>((resolve) => (releaseResponse = resolve));
  await page.route('**/api/practice/draft', async (route) => {
    const response = await route.fetch({
      headers: { ...route.request().headers(), origin: 'http://127.0.0.1:3000' },
    });
    expect(response.ok()).toBe(true);
    confirmCommit();
    await released;
    await route.abort().catch(() => undefined);
  });

  try {
    const pendingSource = '# Synthetic save later undone in editor\n' + REFERENCE_CODE;
    await page.getByLabel('Python solution').fill(pendingSource);
    await committed;
    expect((await (await request.get('/api/practice/session')).json()).draft.source).toBe(
      pendingSource
    );
    await page.getByLabel('Python solution').fill(originalSource);
    const warnsBeforeLeaving = await page.evaluate(() => {
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    });
    releaseResponse();
    await expect(page.getByRole('button', { name: 'Retry save', exact: true })).toBeVisible();
    await page.unroute('**/api/practice/draft');
    await page.reload();

    await expect(page.getByLabel('Python solution')).toHaveValue(originalSource);
    await expect(page.getByRole('button', { name: 'Keep my edits', exact: true })).toBeVisible();
    expect(warnsBeforeLeaving).toBe(true);
    expect((await (await request.get('/api/practice/session')).json()).draft.source).toBe(
      pendingSource
    );

    await page.getByRole('button', { name: 'Keep my edits', exact: true }).click();
    await expect(page.locator('#draft-status')).toHaveText('Draft saved to your local database.');
    expect((await (await request.get('/api/practice/session')).json()).draft.source).toBe(
      originalSource
    );
  } finally {
    releaseResponse();
  }
});

test('should reconcile an uncertain reverted save when reload observes the original database draft', async ({
  page,
  request,
}) => {
  await open(page);
  page.on('dialog', (dialog) => dialog.accept());
  const originalSource = '# Synthetic original before uncertain write\n' + REFERENCE_CODE;
  await save(page, originalSource);
  const original = (await (await request.get('/api/practice/session')).json()).draft;
  await page.route('**/api/practice/draft', (route) => route.abort());
  const pendingSource = '# Synthetic delayed write with an older version\n' + REFERENCE_CODE;
  await page.getByLabel('Python solution').fill(pendingSource);
  await expect(page.getByRole('button', { name: 'Retry save', exact: true })).toBeVisible();

  await page.getByLabel('Python solution').fill(originalSource);
  await page.unroute('**/api/practice/draft');
  const reconciled = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/practice/draft') && response.request().method() === 'PUT',
    { timeout: 10_000 }
  );
  await page.reload();
  expect((await reconciled).ok()).toBe(true);
  await expect(page.locator('#draft-status')).toHaveText('Draft saved to your local database.');

  const delayed = await request.put('/api/practice/draft', {
    headers: { Origin: 'http://127.0.0.1:3000' },
    data: { apiVersion: 1, ...original, source: pendingSource },
  });
  expect(delayed.status()).toBe(409);
  expect((await (await request.get('/api/practice/session')).json()).draft.source).toBe(
    originalSource
  );
});

test('should retain a completed result for retry when the result endpoint is unavailable across reload', async ({
  page,
  request,
}) => {
  await open(page);
  await save(page, '# Synthetic result recovery\n' + REFERENCE_CODE);
  await page.route('**/api/practice/attempts/*/result', (route) => route.abort());
  await page.getByRole('button', { name: 'Check solution', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Retry saving result', exact: true })
  ).toBeVisible();
  const pending = (await (await request.get('/api/practice/session')).json()).latestAttempt;
  expect(pending.report).toBeNull();

  await page.unroute('**/api/practice/attempts/*/result');
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Retry saving result', exact: true })
  ).toBeVisible();
  await page.getByRole('button', { name: 'Retry saving result', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Retry saving result', exact: true })).toHaveCount(
    0
  );
  await page.reload();
  await expect(page.getByText('6/6 cases passed', { exact: true })).toBeVisible();
  const saved = (await (await request.get('/api/practice/session')).json()).latestAttempt;
  expect(saved.id).toBe(pending.id);
  expect(saved.report.type).toBe('result');
});

test('should keep an unfinished snapshot when reloading an active run then allow another attempt', async ({
  page,
  request,
}) => {
  await open(page);
  await save(page, 'def positive_even(values):\n    while True:\n        pass\n');
  await page.getByRole('button', { name: 'Check solution', exact: true }).click();
  await expect(page.getByText('Running your function…', { exact: true })).toBeVisible();
  const pending = (await (await request.get('/api/practice/session')).json()).latestAttempt;
  await page.reload();
  await expect(page.getByLabel('Python solution')).toHaveValue(pending.source);
  await expect(
    page.getByText('Your last submission has no saved result. Run again to create another attempt.')
  ).toBeVisible();

  await save(page, REFERENCE_CODE);
  await page.getByRole('button', { name: 'Check solution', exact: true }).click();
  await expect(page.getByText('6/6 cases passed', { exact: true })).toBeVisible();
  const previous = await (await request.get(`/api/practice/attempts/${pending.id}`)).json();
  expect(previous.source).toBe(pending.source);
  expect(previous.report).toBeNull();
});

test('should recover both pending results when two tabs lose completion saves then close', async ({
  browser,
  request,
}) => {
  const context = await browser.newContext();
  const a = await context.newPage();
  const b = await context.newPage();
  try {
    await open(a);
    await save(a, REFERENCE_CODE);
    await open(b);
    for (const page of [a, b]) {
      await page.route('**/api/practice/attempts/*/result', (route) => route.abort());
    }
    await a.getByRole('button', { name: 'Check solution', exact: true }).click();
    await expect(a.getByRole('button', { name: 'Retry saving result', exact: true })).toBeEnabled();
    const firstId = (await (await request.get('/api/practice/session')).json()).latestAttempt.id;
    await b.getByRole('button', { name: 'Check solution', exact: true }).click();
    await expect(b.getByRole('button', { name: 'Retry saving result', exact: true })).toBeEnabled();
    const secondId = (await (await request.get('/api/practice/session')).json()).latestAttempt.id;
    expect(firstId).not.toBe(secondId);
    await a.close();
    await b.close();

    const reopened = await context.newPage();
    await reopened.goto('/practice');
    const retry = reopened.getByRole('button', { name: 'Retry saving result', exact: true });
    const completedCount = async () => {
      const attempts = await Promise.all(
        [firstId, secondId].map(async (id) =>
          (await request.get(`/api/practice/attempts/${id}`)).json()
        )
      );
      return attempts.filter((attempt) => attempt.report !== null).length;
    };
    await expect(retry).toBeEnabled();
    await retry.click();
    await expect.poll(completedCount).toBe(1);
    await expect(retry).toBeEnabled();
    await retry.click();
    await expect.poll(completedCount).toBe(2);
    await expect(retry).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test('should warn before leaving when browser recovery storage is unavailable but database saves work', async ({
  page,
  request,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('Synthetic unavailable storage', 'QuotaExceededError');
    };
  });
  await open(page);
  const source = '# Synthetic storage warning\n' + REFERENCE_CODE;
  await save(page, source);
  await expect(
    page.getByText(
      'Browser recovery storage is unavailable. Keep this tab open until the draft and result are saved.'
    )
  ).toBeVisible();
  expect((await (await request.get('/api/practice/session')).json()).draft.source).toBe(source);
});

test('should reject foreign origins and unsupported contracts when accessing local product persistence', async ({
  request,
}) => {
  const response = await request.get('/api/practice/session');
  expect(response.headers()['cache-control']).toBe('no-store');
  const session = await response.json();
  expect(session.challenge.referenceSource).toBeUndefined();
  expect(session.challenge.checkCases).toBeUndefined();
  const draft = { apiVersion: 1, ...session.draft };

  for (const origin of ['http://127.0.0.1:3001', 'https://untrusted.invalid']) {
    expect(
      (
        await request.put('/api/practice/draft', { headers: { Origin: origin }, data: draft })
      ).status()
    ).toBe(403);
    expect(
      (await request.get('/api/practice/session', { headers: { Origin: origin } })).status()
    ).toBe(403);
  }
  const headers = { Origin: 'http://127.0.0.1:3000' };
  expect(
    (
      await request.put('/api/practice/draft', { headers, data: { ...draft, apiVersion: 2 } })
    ).status()
  ).toBe(400);
  expect(
    (
      await request.put('/api/practice/draft', {
        headers,
        data: { ...draft, accountId: 'untrusted' },
      })
    ).status()
  ).toBe(400);
  expect(
    (
      await request.put('/api/practice/draft', {
        headers,
        data: { ...draft, source: 'x'.repeat(12_001) },
      })
    ).status()
  ).toBe(400);
  expect(
    (
      await request.put('/api/practice/draft', {
        headers: { ...headers, 'Content-Type': 'application/json' },
        data: 'x'.repeat(100_001),
      })
    ).status()
  ).toBe(413);
});
