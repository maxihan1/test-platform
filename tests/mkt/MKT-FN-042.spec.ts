import { defineCase, test, verify } from '@platform/kit';

import { 게시판목록화면 } from './pages/board-list.page.js';

type 글요약 = { id: number; title: string; commentCount: number };

export const spec = defineCase({
  tcId: 'MKT-FN-042',
  name: '게시판 목록에서 댓글이 있는 글은 제목 옆에 댓글 수가 붙고 댓글이 없는 글은 붙지 않는다',
  precondition: ['댓글이 있는 글과 댓글이 없는 글이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);
  const 첫쪽 = (await (await page.request.get('/api/posts?page=1&size=10')).json()).items as 글요약[];
  const 댓글있는글 = 첫쪽.find((글) => 글.commentCount > 0);
  const 댓글없는글 = 첫쪽.find((글) => 글.commentCount === 0);

  await test.step('게시판 목록 화면을 연다', async () => {
    await 목록.열기();
    await 목록.글줄().first().waitFor();
    await verify('댓글이 있는 글과 댓글이 없는 글이 있다', [댓글있는글 !== undefined, 댓글없는글 !== undefined], [true, true], { blocker: true });
    await verify(
      '댓글이 있는 글은 제목 옆에 댓글 수가 「[3]」 꼴로 붙는다',
      await 목록.댓글수표시(댓글있는글?.title ?? '').innerText(),
      `[${댓글있는글?.commentCount}]`,
    );
    await verify('댓글이 0개인 글은 제목 옆에 댓글 수가 붙지 않는다', await 목록.댓글수표시(댓글없는글?.title ?? '').count(), 0);
  });
});
