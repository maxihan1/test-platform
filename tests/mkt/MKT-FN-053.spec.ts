import { defineCase, test, verify } from '@platform/kit';

import { 게시글상세화면 } from './pages/board-detail.page.js';

type 글요약 = { id: number };

export const spec = defineCase({
  tcId: 'MKT-FN-053',
  name: '없는 글 번호로 들어가면 「삭제되었거나 존재하지 않는 게시글입니다」가 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);
  const 가장큰번호 = Math.max(...((await (await page.request.get('/api/posts?size=100')).json()).items as 글요약[]).map((글) => 글.id));

  await test.step('없는 글 번호로 상세 화면을 연다', async () => {
    await 상세.열기(가장큰번호 + 1_000_000);
    await 상세.목록버튼().waitFor();
    await verify('없는 글 번호로 들어가면 「삭제되었거나 존재하지 않는 게시글입니다」가 보인다', await 상세.없는글문구().isVisible(), true);
  });
});
