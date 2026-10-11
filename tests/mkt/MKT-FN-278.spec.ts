import { defineCase, test, verify } from '@platform/kit';

export const spec = defineCase({
  tcId: 'MKT-FN-278',
  name: '실패 응답 본문에 code 와 한국어 문장 message 가 있다',
  precondition: ['로그인하지 않은 요청이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('없는 글 GET /api/posts/999999 를 부른다', async () => {
    const res = await request.get('/api/posts/999999');
    const 본문 = (await res.json()) as { code?: unknown; message?: unknown };
    const 코드가있다 = typeof 본문.code === 'string' && 본문.code !== '';
    const 한국어문장이다 = typeof 본문.message === 'string' && /[가-힣]/.test(본문.message);
    await verify('실패 응답 본문에 code 와 한국어 문장 message 가 있다', 코드가있다 && 한국어문장이다, true);
  });
});
