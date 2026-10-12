import { defineCase, test, verify } from '@platform/kit';

import { 요청세션아이디 } from './helpers/common-tools.helper.js';

export const spec = defineCase({
  tcId: 'MKF-FN-276',
  name: '비회원이 부른 게시글 목록 조회는 200 이고 공지를 뺀 글이 모두 질문이다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  await test.step('비회원인지 확인한다', async () => {
    await verify('비회원이다', await 요청세션아이디(request), null, { blocker: true });
  });

  await test.step('비회원으로 GET /api/posts?category=질문&sort=views 를 부른다', async () => {
    const res = await request.get('/api/posts', { params: { category: '질문', sort: 'views' } });
    const { items } = (await res.json()) as { items: { category: string }[] };
    const 모두질문 = items.length > 0 && items.every((글) => 글.category === '질문');
    await verify('비회원이 부른 게시글 목록 조회는 200 이고 공지를 뺀 글이 모두 질문이다', { 상태: res.status(), 모두질문 }, { 상태: 200, 모두질문: true });
  });
});
