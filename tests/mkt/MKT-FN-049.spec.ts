import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 고유제목, 글머리 } from './helpers/board.helper.js';
import { 글만들기, 글지우기, 지난글치우기 } from './helpers/post.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-049',
  name: '오늘 쓴 글의 작성일은 「14:05」 처럼 시각만 보인다',
  platforms: ['desktop'],
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 목록 = new 게시판목록화면(page);
  const 머리 = new 머리글(page);
  const 제목 = 고유제목(spec.tcId, '오늘 글');
  let 글번호 = 0;

  try {
    await test.step('회원으로 로그인한다', async () => {
      await 방해막기(page);
      await 화면로그인(page, params.loginId ?? '', params.password ?? '');
      await 지난글치우기(page.request, 글머리(spec.tcId));
      await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
    });

    await test.step('오늘 글을 하나 쓰고 게시판 목록을 연다', async () => {
      글번호 = await 글만들기(page.request, { title: 제목 });
      await 목록.열기();
      await 목록.행(제목).waitFor();
      await verify('오늘 쓴 글의 작성일은 「14:05」 처럼 시각만 보인다', /^\d{2}:\d{2}$/.test((await 목록.행읽기(목록.행(제목))).작성일), true);
    });
  } finally {
    if (글번호 !== 0) await 글지우기(page.request, 글번호);
    await 지난글치우기(page.request, 글머리(spec.tcId));
  }
});
