import { defineCase, test, verify } from '@platform/kit';

import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-117',
  name: '비회원이 연 게시글 상세에는 댓글 입력칸 대신 「댓글을 쓰려면 로그인하세요」 링크가 보인다',
  precondition: ['비회원이다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);
  await 방해막기(page);

  await test.step('게시글 상세를 연다', async () => {
    await 상세.열기(1);
    await 상세.댓글까지그려질때까지();
    await verify('비회원이 연 게시글 상세에는 댓글 입력칸 대신 「댓글을 쓰려면 로그인하세요」 링크가 보인다', (await 상세.로그인안내링크.isVisible()) && !(await 상세.새댓글입력.isVisible()), true);
  });
});
