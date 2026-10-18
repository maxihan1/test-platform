import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

export const spec = defineCase({
  tcId: 'MKT-FN-376',
  name: '목록 조회에 page 2 · size 5 를 주면 items 5개와 total · page 2 · size 5 로 응답한다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: z.object({
    쪽: z.number().int().min(1).describe('쪽 번호 — 글이 6개 이상 있어 그 쪽이 차는 번호').default(2),
    크기: z.number().int().min(1).describe('한 쪽 크기 — 1 이상').default(5),
  }),
  expected: null,
});

test(spec, async ({ request, params }) => {
  await test.step('비회원 상태를 확인한다', async () => {
    const 응답 = await request.get('/api/session');
    await verify('세션에 회원이 없다', ((await 응답.json()) as { user: unknown }).user, null, { blocker: true });
  });

  await test.step('GET /api/posts?page=2&size=5 를 부른다', async () => {
    const 응답 = await request.get('/api/posts', { params: { page: params.쪽, size: params.크기 } });
    const 본문 = (await 응답.json()) as { items: unknown[]; total: number; page: number; size: number };
    await verify(
      '목록 조회에 page 2 · size 5 를 주면 items 5개와 total · page 2 · size 5 로 응답한다',
      { 개수: 본문.items.length, 전체수는숫자: typeof 본문.total === 'number', 쪽: 본문.page, 크기: 본문.size },
      { 개수: params.크기, 전체수는숫자: true, 쪽: params.쪽, 크기: params.크기 },
    );
  });
});
