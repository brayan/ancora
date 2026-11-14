export function getDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL is required in production.');
  }

  return 'postgresql://ancora:ancora@127.0.0.1:5433/ancora_practice';
}

export function getPracticeServiceConfig() {
  return {
    url: 'http://127.0.0.1:8001',
    token: process.env.PRACTICE_SERVICE_TOKEN ?? '',
  };
}
