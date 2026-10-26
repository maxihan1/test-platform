import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 글지우기 } from './helpers/data.helper.js';
import { 고유낱말, 글올리기, 일회용회원의글만들기 } from './helpers/board-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-111',
  name: '검색 조건 「제목」으로 검색하면 제목에 검색어가 든 글만 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);
  const 머리 = new 머리글(page);
  const 낱말 = 고유낱말('제목낱말');
  const 만든글: number[] = [];

  try {
    await test.step('일회용 회원으로 제목에 낱말이 든 글과 본문에만 낱말이 든 글을 올려 둔다', async () => {
      const 제목글 = await 일회용회원의글만들기(page.request, { 제목: `${낱말} 제목글` });
      만든글.push(제목글.번호);
      만든글.push(await 글올리기(page.request, { 제목: 고유낱말('본문글'), 본문: `본문에만 ${낱말} 낱말이 들어 있는 글입니다` }));
      await 안내창막기(page);
      await 목록.열기();
      await 머리.그려질때까지();
      await verify('일회용 회원으로 로그인해 있다', await 머리.로그아웃.isVisible(), true, { blocker: true });
      await verify('게시판 목록 화면 제목 「커뮤니티」가 보인다', await 목록.큰제목.isVisible(), true, { blocker: true });
    });

    await test.step('내가 쓴 글의 제목 낱말로 「제목」 검색한다', async () => {
      await 목록.검색하기(낱말, '제목');
      await 목록.그려질때까지();
      const 제목들 = (await 목록.일반행들()).map((행) => 행.제목);
      await verify('검색 조건 「제목」으로 검색하면 제목에 검색어가 든 글만 보인다', 제목들, [`${낱말} 제목글`]);
    });
  } finally {
    for (const 번호 of 만든글) await 글지우기(page.request, 번호);
  }
});
