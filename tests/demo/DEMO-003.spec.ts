import { expect, test } from '@playwright/test';

test('제목과 본문과 작성자를 넣어 글을 등록하면 등록된 내용이 그대로 돌아온다', async ({ request }) => {
  const userId = 7;
  const title = '테스트 자동화 플랫폼';
  const body = '명세가 곧 테스트다';

  const res = await request.post('https://jsonplaceholder.typicode.com/posts', {
    data: { userId, title, body },
  });

  expect(res.status()).toBe(201);

  const created = await res.json();
  expect(created.userId).toBe(userId);
  expect(created.title).toBe(title);
  expect(created.body).toBe(body);
});
