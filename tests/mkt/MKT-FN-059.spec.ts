import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 고유제목, 글머리, 홈열고알림수읽기 } from './helpers/board.helper.js';
import { 글만들기, 글지우기, 댓글달기, 지난글치우기 } from './helpers/post.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-059',
  name: '댓글의 「답글」 을 누르면 그 댓글 바로 아래에 답글 입력칸이 열린다',
  platforms: ['desktop'],
  precondition: ['회원이 단 댓글이 있는 글이다', '회원이 단 댓글에 답글이 달려 있다', '회원이 직접 쓴 글이 하나 있다'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 게시글상세화면(page);
  const 머리 = new 머리글(page);
  const 고친댓글 = '고친 내 댓글';
  const 답글내용 = '내 댓글에 단 답글';
  let 글번호 = 0;
  let 댓글번호 = 0;
  let 답글번호 = 0;

  try {
    await test.step('회원으로 로그인해 댓글과 답글이 달린 글을 만든다', async () => {
      await 방해막기(page);
      await 화면로그인(page, params.loginId ?? '', params.password ?? '');
      await 지난글치우기(page.request, 글머리(spec.tcId));
      글번호 = await 글만들기(page.request, { title: 고유제목(spec.tcId, '댓글 조작') });
      댓글번호 = await 댓글달기(page.request, 글번호, '내 댓글');
      답글번호 = await 댓글달기(page.request, 글번호, 답글내용, 댓글번호);
      await 상세.열기(글번호);
      await 상세.댓글불러오기기다리기();
      await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
      await verify('댓글 둘이 보인다', await 상세.댓글줄들.count(), 2, { blocker: true });
    });

    const 댓글줄 = 상세.댓글(댓글번호);
    const 답글줄 = 상세.댓글(답글번호);

    await test.step('댓글의 「답글」 을 누른다', async () => {
      await 상세.답글버튼(댓글줄).click();
      await 상세.답글입력칸(댓글줄).waitFor();
      const 본문자리 = await 상세.댓글본문(댓글줄).boundingBox();
      const 입력칸자리 = await 상세.답글입력칸(댓글줄).boundingBox();
      await verify(
        '댓글의 「답글」 을 누르면 그 댓글 바로 아래에 답글 입력칸이 열린다',
        { 열림: await 상세.답글입력칸(댓글줄).isVisible(), 아래: 본문자리 !== null && 입력칸자리 !== null && 입력칸자리.y >= 본문자리.y + 본문자리.height },
        { 열림: true, 아래: true },
      );
    });

    await test.step('내가 단 댓글을 확인한다', async () => {
      await verify(
        '내가 단 댓글에는 「수정」 · 「삭제」 가 보인다',
        { 수정: await 상세.댓글수정버튼(댓글줄).isVisible(), 삭제: await 상세.댓글삭제버튼(댓글줄).isVisible() },
        { 수정: true, 삭제: true },
      );
    });

    await test.step('내 댓글의 「수정」 을 누른다', async () => {
      await 상세.댓글수정버튼(댓글줄).click();
      await 상세.수정입력칸(댓글줄).waitFor();
      await verify(
        '댓글 「수정」 을 누르면 그 자리가 입력칸으로 바뀌고 「저장」 · 「취소」 가 보인다',
        {
          입력칸: await 상세.수정입력칸(댓글줄).isVisible(),
          원래글: await 상세.댓글본문(댓글줄).isVisible(),
          저장: await 상세.저장버튼(댓글줄).isVisible(),
          취소: await 상세.취소버튼(댓글줄).isVisible(),
        },
        { 입력칸: true, 원래글: false, 저장: true, 취소: true },
      );
    });

    await test.step('댓글 내용을 고쳐 「저장」 을 누른다', async () => {
      await 상세.수정입력칸(댓글줄).fill(고친댓글);
      await 상세.저장버튼(댓글줄).click();
      await 상세.수정입력칸(댓글줄).waitFor({ state: 'detached' });
      await verify('댓글을 고쳐 저장하면 「(수정됨)」 이 붙는다', await 상세.댓글본문(댓글줄).innerText(), `${고친댓글} (수정됨)`);
    });

    await test.step('답글이 달린 내 댓글을 지운다', async () => {
      await 상세.댓글삭제버튼(댓글줄).click();
      await 상세.댓글제목.filter({ hasText: '댓글 1' }).waitFor();
      await verify(
        '답글이 달린 댓글을 지우면 그 자리에 「삭제된 댓글입니다」 가 남고 답글은 그대로 보인다',
        { 자리: await 상세.댓글본문(댓글줄).innerText(), 답글: await 상세.댓글본문(답글줄).innerText() },
        { 자리: '삭제된 댓글입니다', 답글: 답글내용 },
      );
    });

    await test.step('내 글에 내가 댓글을 달고 홈 화면을 연다', async () => {
      const 전 = await 홈열고알림수읽기(page, 머리);
      await 댓글달기(page.request, 글번호, '내 글에 단 내 댓글');
      const 후 = await 홈열고알림수읽기(page, 머리);
      await verify('내 글에 내가 댓글을 달면 알림 수가 늘지 않는다', 후 - 전, 0);
    });
  } finally {
    if (글번호 !== 0) await 글지우기(page.request, 글번호);
    await 지난글치우기(page.request, 글머리(spec.tcId));
  }
});
