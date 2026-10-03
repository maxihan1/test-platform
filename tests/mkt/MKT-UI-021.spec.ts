import { defineCase, test, verify } from '@platform/kit';

import { 게시글상세화면 } from './pages/board-detail.page.js';

type 글요약 = { id: number; commentCount: number };
type 댓글 = { deleted: boolean };

export const spec = defineCase({
  tcId: 'MKT-UI-021',
  name: '비회원 게시글 상세 화면에 본문 정보 · 목록 버튼 · 댓글 제목 · 로그인 링크가 보인다',
  precondition: ['비회원이다', '댓글이 있는 글이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 게시글상세화면(page);
  const 목록응답 = await page.request.get('/api/posts?category=%EC%A0%84%EC%B2%B4&size=100');
  const 글들: 글요약[] = (await 목록응답.json()).items;
  const 댓글있는글 = 글들.find((글) => 글.commentCount > 0);
  const 댓글응답 = 댓글있는글 === undefined ? undefined : await page.request.get(`/api/posts/${댓글있는글.id}/comments`);
  const 댓글수 = 댓글응답 === undefined ? -1 : ((await 댓글응답.json()).items as 댓글[]).filter((댓글항목) => !댓글항목.deleted).length;

  await test.step('게시글 상세 화면을 연다', async () => {
    await 상세.열기(댓글있는글?.id ?? 0);
    await 상세.댓글줄().first().waitFor();
    await verify('댓글이 있는 글이다', 댓글있는글 !== undefined && 댓글수 > 0, true, { blocker: true });
    await verify(
      '상세 화면에 제목 · 분류 · 작성자 · 작성일 · 조회수 · 본문이 보인다',
      [
        await 상세.제목().isVisible(),
        await 상세.분류표시().isVisible(),
        await 상세.작성자표시().isVisible(),
        await 상세.작성일표시().isVisible(),
        await 상세.조회수표시().isVisible(),
        await 상세.본문().isVisible(),
      ],
      [true, true, true, true, true, true],
    );
    await verify('상세 아래에 「목록」 버튼이 보인다', await 상세.목록버튼().isVisible(), true);
    await verify('상세 아래에 「댓글 {개수}」 제목이 보인다', await 상세.댓글제목().innerText(), `댓글 ${댓글수}`);
    await verify(
      '비회원에게는 댓글 입력칸 대신 「댓글을 쓰려면 로그인하세요」 링크가 보인다',
      [await 상세.댓글로그인링크().isVisible(), await 상세.새댓글입력칸().isVisible()],
      [true, false],
    );
  });
});
