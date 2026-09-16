import { expect, test } from '@playwright/test';

test('선택한 자원 목록을 조회하면 비어 있지 않은 배열이 돌아온다', async ({ request }) => {
  const resource = 'albums';

  const res = await request.get(`https://jsonplaceholder.typicode.com/${resource}`);

  expect(res.status()).toBe(200);

  const items = await res.json();
  expect(Array.isArray(items)).toBe(true);
  expect(items.length).toBeGreaterThan(0);
});
