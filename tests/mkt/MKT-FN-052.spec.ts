import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 고유제목, 글머리, 남의시드글 } from './helpers/board.helper.js';
import { 글만들기, 글지우기, 지난글치우기 } from './helpers/post.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-052',
  name: '내 글 상세에는 「수정」 · 「삭제」 버튼이 보인다',
  platforms: ['desktop'],
  precondition: ['회원이 직접 쓴 글이 하나 있다', '회원으로 로그인해 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 게시글상세화면(page);
  const 머리 = new 머리글(page);
  const 제목 = 고유제목(spec.tcId, '내 글');
  let 글번호 = 0;

  try {
    await test.step('회원으로 로그인해 글을 하나 만든다', async () => {
      await 방해막기(page);
      await 화면로그인(page, params.loginId ?? '', params.password ?? '');
      await 지난글치우기(page.request, 글머리(spec.tcId));
      글번호 = await 글만들기(page.request, { title: 제목 });
      await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
    });

    await test.step('내 글 상세를 연다', async () => {
      await 상세.열기(글번호);
      await verify('게시글 상세 제목이 방금 만든 글의 제목이다', await 상세.제목.innerText(), 제목, { blocker: true });
      await verify(
        '내 글 상세에는 「수정」 · 「삭제」 버튼이 보인다',
        { 수정: await 상세.수정링크.isVisible(), 삭제: await 상세.삭제버튼.isVisible() },
        { 수정: true, 삭제: true },
      );
    });

    await test.step('남의 글 상세를 연다', async () => {
      await 상세.열기(남의시드글);
      await 상세.댓글불러오기기다리기();
      await verify(
        '남의 글 상세에는 「수정」 · 「삭제」 버튼이 보이지 않는다',
        { 수정: await 상세.수정링크.isVisible(), 삭제: await 상세.삭제버튼.isVisible() },
        { 수정: false, 삭제: false },
      );
    });
  } finally {
    if (글번호 !== 0) await 글지우기(page.request, 글번호);
    await 지난글치우기(page.request, 글머리(spec.tcId));
  }
});
