import { expect, test } from '@playwright/test';

test('글 번호를 지정하지 않고 댓글을 조회하면 전체 댓글이 돌아온다', async ({ request }) => {
  const postId: number | undefined = undefined;

  const url = postId === undefined
    ? 'https://jsonplaceholder.typicode.com/comments'
    : `https://jsonplaceholder.typicode.com/comments?postId=${postId}`;

  const res = await request.get(url);

  expect(res.status()).toBe(200);

  const comments = await res.json();
  expect(comments.length).toBeGreaterThan(100);
});
