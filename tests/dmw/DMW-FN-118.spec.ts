import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { API로그인 } from './helpers/account.helper.js';
import { 글지우기 } from './helpers/data.helper.js';
import { 로그인상태인가, 일회용회원의글만들기 } from './helpers/board-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-118',
  name: '오늘 쓴 글의 작성일은 「14:05」처럼 시각만 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다', '비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);
  const 머리 = new 머리글(page);
  let 글: Awaited<ReturnType<typeof 일회용회원의글만들기>> | undefined;
  let 지움 = false;

  try {
    await test.step('일회용 회원으로 오늘 글을 하나 올려 둔다', async () => {
      글 = await 일회용회원의글만들기(page.request);
      await 안내창막기(page);
      await 목록.열기({ 검색어: 글.제목 });
      await 머리.그려질때까지();
      await verify('일회용 회원으로 로그인해 있다', await 머리.로그아웃.isVisible(), true, { blocker: true });
      await verify('올려 둔 글이 게시판 목록에 보인다', await 목록.제목링크(글.제목).count(), 1, { blocker: true });
    });

    await test.step('오늘 글을 하나 쓴 뒤 목록에서 작성일을 확인한다', async () => {
      const 행 = (await 목록.일반행들()).find((하나) => 하나.제목 === 글?.제목);
      await verify('오늘 쓴 글의 작성일은 「14:05」처럼 시각만 보인다', /^\d{2}:\d{2}$/.test(행?.작성일 ?? ''), true);
      if (글 !== undefined) {
        await 글지우기(page.request, 글.번호);
        지움 = true;
      }
    });

    await test.step('로그아웃해 비회원이 된 채 게시판 목록 마지막 쪽을 연다', async () => {
      await page.context().clearCookies();
      const 응답 = await page.request.get('/api/posts?page=1&size=10');
      const { total } = (await 응답.json()) as { total: number };
      await 목록.열기({ 쪽: Math.max(1, Math.ceil(total / 10)) });
      await verify('비회원이다', await 로그인상태인가(page, '비회원'), true, { blocker: true });
    });

    await test.step('어제 이전에 쓴 글의 작성일을 확인한다', async () => {
      const 날짜아닌것 = (await 목록.일반행들()).map((행) => 행.작성일).filter((작성일) => !/^\d{4}-\d{2}-\d{2}$/.test(작성일));
      await verify('오늘 전에 쓴 글의 작성일은 「2026-09-20」처럼 날짜만 보인다', 날짜아닌것, []);
    });
  } finally {
    if (글 !== undefined && !지움) {
      await API로그인(page.request, 글.회원.loginId, 글.회원.password);
      await 글지우기(page.request, 글.번호);
    }
  }
});
