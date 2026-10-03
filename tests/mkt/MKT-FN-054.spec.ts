import { defineCase, test, verify } from '@platform/kit';

import { 게시글상세화면 } from './pages/board-detail.page.js';

type 글요약 = { id: number; commentCount: number };
type 댓글 = { content: string; createdAt: number; deleted: boolean };

export const spec = defineCase({
  tcId: 'MKT-FN-054',
  name: '댓글이 둘 이상인 글의 상세 화면에 댓글이 오래된 순으로 보이고 작성자 · 시각 · 내용이 있다',
  precondition: ['댓글이 둘 이상인 글이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);
  const 글 = ((await (await page.request.get('/api/posts?size=100')).json()).items as 글요약[]).find((항목) => 항목.commentCount >= 2);
  const 댓글들 = 글 === undefined ? [] : (((await (await page.request.get(`/api/posts/${글.id}/comments`)).json()).items) as 댓글[]).filter((항목) => !항목.deleted);
  const 오래된순 = [...댓글들].sort((앞, 뒤) => 앞.createdAt - 뒤.createdAt).map((항목) => 항목.content);

  await test.step('게시글 상세 화면을 연다', async () => {
    await 상세.열기(글?.id ?? 0);
    await 상세.댓글줄().first().waitFor();
    await verify('댓글이 둘 이상인 글이다', 댓글들.length >= 2, true, { blocker: true });
    await verify('댓글 목록이 오래된 순으로 보인다', (await 상세.댓글내용().allInnerTexts()).map((글자) => 글자.trim()), 오래된순);
    await verify(
      '각 댓글에 작성자 · 작성 시각 · 내용이 있다',
      {
        작성자: (await 상세.댓글작성자().allInnerTexts()).filter((글자) => 글자.trim() !== '').length,
        시각: (await 상세.댓글시각().allInnerTexts()).filter((글자) => /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(글자.trim())).length,
        내용: (await 상세.댓글내용().allInnerTexts()).filter((글자) => 글자.trim() !== '').length,
      },
      { 작성자: 댓글들.length, 시각: 댓글들.length, 내용: 댓글들.length },
    );
  });
});
