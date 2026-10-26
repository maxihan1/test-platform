import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 글지우기 } from './helpers/data.helper.js';
import { 고유낱말, 로그인상태인가, 일회용회원의글만들기 } from './helpers/board-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-115',
  name: '결과가 없는 검색어로 검색하면 표 대신 「검색 결과가 없습니다」가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다', '일회용 회원으로 로그인해 있다'],
  params: z.object({
    없는검색어: z.string().min(2).describe('검색어 — 2자 이상 · 어느 글에도 없는 낱말').default('없는낱말zzqx'),
  }),
  expected: null,
  techniques: ['경계값 분석'],
});

test(spec, async ({ page, params }) => {
  const 목록 = new 게시판목록화면(page);
  const 머리 = new 머리글(page);
  const 낱말 = 고유낱말('한건');
  let 글번호 = 0;

  try {
    await test.step('게시판 목록 화면을 연다', async () => {
      await 안내창막기(page);
      await 목록.열기();
      await verify('비회원이다', await 로그인상태인가(page, '비회원'), true, { blocker: true });
      await verify('게시판 목록 화면 제목 「커뮤니티」가 보인다', await 목록.큰제목.isVisible(), true, { blocker: true });
    });

    await test.step('어느 글에도 없는 검색어로 검색한다', async () => {
      await 목록.검색하기(params.없는검색어);
      await 목록.빈안내.waitFor();
      const 안내 = await verify('「검색 결과가 없습니다」가 보인다', await 목록.빈안내.isVisible(), true);
      const 표없음 = await verify('표가 보이지 않는다', await 목록.표.count(), 0);
      await verify('결과가 없는 검색어로 검색하면 표 대신 「검색 결과가 없습니다」가 보인다', 안내 && 표없음, true);
    });

    await test.step('일회용 회원으로 글을 올린 게시판 목록을 연다', async () => {
      const 글 = await 일회용회원의글만들기(page.request, { 제목: `${낱말} 제목글` });
      글번호 = 글.번호;
      await 목록.열기();
      await 머리.그려질때까지();
      await verify('일회용 회원으로 로그인해 있다', await 머리.로그아웃.isVisible(), true, { blocker: true });
    });

    await test.step('내가 쓴 글 하나에만 든 검색어로 검색한다', async () => {
      await 목록.검색하기(낱말);
      await 목록.그려질때까지();
      await verify('결과가 하나인 검색어로 검색하면 글 한 건이 보인다', (await 목록.일반행들()).length, 1);
    });
  } finally {
    if (글번호 !== 0) await 글지우기(page.request, 글번호);
  }
});
