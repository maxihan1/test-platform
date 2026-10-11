import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 고유제목, 글머리, 댓글목록읽기 } from './helpers/board.helper.js';
import { 글만들기, 글지우기, 지난글치우기 } from './helpers/post.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-057',
  name: '댓글 「등록」 을 빠르게 두 번 눌러도 댓글은 하나만 생긴다',
  platforms: ['desktop'],
  precondition: ['회원으로 로그인해 있다'],
  techniques: ['오류 추정'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 게시글상세화면(page);
  const 머리 = new 머리글(page);
  const 내용 = '두 번 눌러 보는 댓글';
  let 글번호 = 0;

  try {
    await test.step('회원으로 로그인해 글을 하나 만들고 연다', async () => {
      await 방해막기(page);
      await 화면로그인(page, params.loginId ?? '', params.password ?? '');
      await 지난글치우기(page.request, 글머리(spec.tcId));
      글번호 = await 글만들기(page.request, { title: 고유제목(spec.tcId, '댓글 두 번') });
      await 상세.열기(글번호);
      await 상세.댓글불러오기기다리기();
      await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
      await verify('댓글이 하나도 없다', await 상세.댓글줄들.count(), 0, { blocker: true });
    });

    await test.step('댓글을 적고 「등록」 을 빠르게 두 번 누른다', async () => {
      await 상세.댓글입력칸.fill(내용);
      await 상세.댓글등록버튼.dblclick();
      await 상세.댓글줄들.first().waitFor();
      await page.waitForLoadState('networkidle');
      const 서버댓글 = (await 댓글목록읽기(page.request, 글번호)).filter((댓글) => 댓글.content === 내용);
      await verify(
        '댓글 「등록」 을 빠르게 두 번 눌러도 댓글은 하나만 생긴다',
        { 화면: await 상세.댓글줄들.count(), 서버: 서버댓글.length },
        { 화면: 1, 서버: 1 },
      );
    });
  } finally {
    if (글번호 !== 0) await 글지우기(page.request, 글번호);
    await 지난글치우기(page.request, 글머리(spec.tcId));
  }
});
