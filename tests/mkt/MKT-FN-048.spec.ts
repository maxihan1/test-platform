import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 고유제목, 글머리 } from './helpers/board.helper.js';
import { 글만들기, 글지우기, 지난글치우기 } from './helpers/post.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-048',
  name: '맞는 글이 없는 검색어로 검색하면 표 대신 「검색 결과가 없습니다」 가 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다', '제목이 고유한 내 글이 하나 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 목록 = new 게시판목록화면(page);
  const 머리 = new 머리글(page);
  const 제목 = 고유제목(spec.tcId, '고유');
  let 글번호 = 0;

  try {
    await test.step('게시판 목록 화면을 연다', async () => {
      await 방해막기(page);
      await 목록.열기();
      await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
    });

    await test.step('맞는 글이 없는 검색어로 검색한다', async () => {
      await 목록.검색하기('zzzzzzzz');
      await verify(
        '맞는 글이 없는 검색어로 검색하면 표 대신 「검색 결과가 없습니다」 가 보인다',
        { 안내: await 목록.빈상태.innerText(), 표: await 목록.표.count() },
        { 안내: '검색 결과가 없습니다', 표: 0 },
      );
    });

    await test.step('회원으로 로그인해 제목이 고유한 글을 하나 만든다', async () => {
      await 화면로그인(page, params.loginId ?? '', params.password ?? '');
      await 지난글치우기(page.request, 글머리(spec.tcId));
      글번호 = await 글만들기(page.request, { title: 제목 });
      await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
    });

    await test.step('그 고유한 제목으로 검색한다', async () => {
      await 목록.열기();
      await 목록.검색하기(제목);
      await verify('맞는 글이 하나인 검색어로 검색하면 표에 글 하나가 보인다', (await 목록.일반행읽기()).map((행) => 행.제목).join(', '), 제목);
    });
  } finally {
    if (글번호 !== 0) await 글지우기(page.request, 글번호);
    await 지난글치우기(page.request, 글머리(spec.tcId));
  }
});
