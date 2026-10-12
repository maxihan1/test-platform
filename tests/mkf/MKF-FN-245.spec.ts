import { defineCase, test, verify } from '@platform/kit';

import { 요청세션아이디 } from './helpers/common-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKF-FN-245',
  name: '목록 조회 응답은 items · total · page · size 칸을 갖고 page 는 1, size 는 5 다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('비회원인지 확인한다', async () => {
    await verify('비회원이다', await 요청세션아이디(request), null, { blocker: true });
  });

  await test.step('GET /api/posts?page=1&size=5 를 부른다', async () => {
    const res = await request.get('/api/posts', { params: { page: 1, size: 5 } });
    const 본문 = (await res.json()) as { items?: unknown; total?: unknown; page?: unknown; size?: unknown };
    const 맞다 = Array.isArray(본문.items) && typeof 본문.total === 'number' && 본문.page === 1 && 본문.size === 5;
    await verify('목록 조회 응답은 items · total · page · size 칸을 갖고 page 는 1, size 는 5 다', 맞다, true);
  });
});
