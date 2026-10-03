import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 게시글상세 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-020',
  name: '게시글 상세 화면에 글 정보 · 목록 버튼 · 댓글 영역이 규칙대로 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다', '댓글이 달린 글이 있다', '답글이 달린 댓글이 있다'],
  params: z.object({
    postId: z.number().describe('댓글이 달린 글 번호').default(48),
    replyText: z.string().min(1).describe('답글 내용').default('그쵸? 색도 예뻐요.'),
  }),
  expected: z.object({
    loginLink: z.string().describe('비회원의 댓글 안내 링크와 댓글 입력칸 개수').default('댓글을 쓰려면 로그인하세요, 0'),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 상세 = new 게시글상세(page);

  await test.step('게시글 상세 화면을 연다', async () => {
    await page.context().addInitScript(() => localStorage.setItem('dm_cookie_ok', '1'));
    await 상세.열기(params.postId);
    await 상세.글이뜰때까지();
    const 개수 = await 상세.댓글들.count();

    const 보임 = await Promise.all([상세.제목, 상세.분류, 상세.작성자, 상세.작성일, 상세.조회수, 상세.본문].map((l) => l.isVisible()));
    await verify('상세에 제목 · 분류 · 작성자 · 작성일 · 조회수 · 본문이 보인다', 보임.every(Boolean), true);
    await verify('상세 아래에 「목록」 버튼이 보인다', await 상세.목록.isVisible(), true);
    await verify('댓글 영역 제목이 「댓글 {개수}」로 보인다', await 상세.댓글제목.innerText(), `댓글 ${개수}`);

    const 시각들 = await 상세.댓글시각들.allInnerTexts();
    await verify('댓글 목록이 오래된 순으로 보인다', 시각들.length > 1 && 시각들.every((t, i) => i === 0 || 시각들[i - 1] <= t), true);
    await verify(
      '각 댓글에 작성자 · 작성 시각 · 내용이 보인다',
      [(await 상세.댓글작성자들.count()), 시각들.length, (await 상세.댓글내용들.count())].join(', '),
      [개수, 개수, 개수].join(', '),
    );
    await verify(
      '비회원에게는 댓글 입력칸 대신 「댓글을 쓰려면 로그인하세요」 링크가 보인다',
      [await 상세.로그인안내.innerText(), await 상세.새댓글칸.count()].join(', '),
      expected.loginLink,
    );
    await verify('답글에는 「답글」 버튼이 없다', await 상세.답글버튼(params.replyText).count(), 0);
  });
});
