import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 고유제목, 글머리, 없는글번호 } from './helpers/board.helper.js';
import { 글만들기, 글지우기, 지난글치우기 } from './helpers/post.helper.js';
import { 게시글상세화면 } from './pages/board-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-055',
  name: '없는 글 번호로 상세를 열면 「삭제되었거나 존재하지 않는 게시글입니다」 가 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다', '회원이 쓰고 지운 글이 하나 있다'],
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
  let 글번호 = 0;

  try {
    await test.step('게시판 화면을 연다', async () => {
      await 방해막기(page);
      await page.goto('/board');
      await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
    });

    await test.step('없는 글 번호로 게시글 상세를 연다', async () => {
      await 상세.열기(없는글번호);
      await verify('없는 글 번호로 상세를 열면 「삭제되었거나 존재하지 않는 게시글입니다」 가 보인다', await 상세.없는글안내.innerText(), '삭제되었거나 존재하지 않는 게시글입니다');
    });

    await test.step('회원으로 로그인해 글을 만들고 지운다', async () => {
      await 화면로그인(page, params.loginId ?? '', params.password ?? '');
      await 지난글치우기(page.request, 글머리(spec.tcId));
      글번호 = await 글만들기(page.request, { title: 고유제목(spec.tcId, '지울 글') });
      await verify('만든 글을 지우면 응답 코드가 204이다', await 글지우기(page.request, 글번호), 204, { blocker: true });
    });

    await test.step('지운 글 번호로 게시글 상세를 연다', async () => {
      await 상세.열기(글번호);
      await verify('지운 글 번호로 상세를 열어도 「삭제되었거나 존재하지 않는 게시글입니다」 가 보인다', await 상세.없는글안내.innerText(), '삭제되었거나 존재하지 않는 게시글입니다');
    });
  } finally {
    await 지난글치우기(page.request, 글머리(spec.tcId));
  }
});
