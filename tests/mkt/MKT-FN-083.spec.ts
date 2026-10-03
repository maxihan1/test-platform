import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-FN-083',
  name: 'GET /api/posts 응답에는 공지글을 따로 담은 notices 칸이 있다',
  platforms: ['desktop'],
  unconfirmed: '기획서와 다름 — 차이 D10: 목록 응답에 기획서에 없는 notices 칸이 더 있다 (작성 요청 5873)',
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({
    notices: z.string().describe('notices 칸이 배열인지와 공지만 담겼는지').default('true, true'),
  }),
});

test(spec, async ({ request, expected }) => {
  await test.step('GET /api/posts 를 부른다', async () => {
    const 응답 = (await (await request.get('/api/posts')).json()) as { notices?: { category: string }[] };
    const 공지들 = 응답.notices;
    await verify(
      'GET /api/posts 응답에는 공지글을 따로 담은 notices 칸이 있다',
      [Array.isArray(공지들), Array.isArray(공지들) && 공지들.length > 0 && 공지들.every((글) => 글.category === '공지')].join(', '),
      expected.notices,
    );
  });
});
