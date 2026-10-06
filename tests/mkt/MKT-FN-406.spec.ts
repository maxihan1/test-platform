import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-FN-406',
  name: '목록 조회는 「items」 · 「total」 · 「page」 · 「size」로 응답한다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ request }) => {
  await test.step('게시글 목록을 page=2 · size=5 로 부른다', async () => {
    const 응답 = await request.get('/api/posts?page=2&size=5');
    await verify('비회원이다', (await request.get('/api/auth/me')).status(), 401, { blocker: true });
    const 본문 = (await 응답.json()) as { items?: unknown[]; total?: number; page?: number; size?: number };
    await verify(
      '목록 조회는 「items」 · 「total」 · 「page」 · 「size」로 응답한다',
      ['items', 'total', 'page', 'size'].filter((키) => 키 in 본문).join(' · '),
      'items · total · page · size',
    );
    await verify('응답의 page 는 2 · size 는 5 이고 items 는 5건이다', [본문.page, 본문.size, 본문.items?.length], [2, 5, 5]);
  });
});
