import { defineCase, test, verify } from '@platform/kit';

import { 글있나, 글하나쓰기, 둘째회원열기, 둘째회원정리하기, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 둘째회원 } from './helpers/board-tools.helper.js';
import { 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKF-UI-117',
  name: '오늘 쓴 글의 작성일은 「14:05」처럼 시각만 보인다',
  precondition: ['오늘 글을 쓴 회원이 있다', '비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);
  const 정리 = 정리함만들기();
  let 글쓴!: 둘째회원;
  let 글번호 = 0;
  let 제목 = '';

  try {
    await test.step('회원이 오늘 글을 하나 쓴다', async () => {
      글쓴 = await 둘째회원열기(page);
      정리.더하기(() => 둘째회원정리하기(글쓴));
      const 글 = await 글하나쓰기(글쓴.api, '오늘글');
      글번호 = 글.id;
      제목 = 글.제목;
    });

    await test.step('오늘 글을 쓴 회원이 있고 보는 사람은 비회원인지 확인한다', async () => {
      await verify('회원이 오늘 쓴 글이 하나 있다', await 글있나(page.request, 글번호), true, { blocker: true });
      await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
    });

    await test.step('게시판 목록을 연다', async () => {
      await 방해막기(page);
      await 목록.열기({ q: 제목 });
      await 목록.제목링크(제목).waitFor();
      const 행 = (await 목록.일반행들()).find((값) => 값.제목 === 제목);
      await verify('오늘 쓴 글의 작성일은 「14:05」처럼 시각만 보인다', /^\d{2}:\d{2}$/.test(행?.작성일 ?? ''), true);
      await 목록.열기();
      await 목록.그려질때까지();
      const 공지들 = await 목록.공지행들();
      await verify('오늘 전에 쓴 글의 작성일은 「2026-09-20」처럼 날짜만 보인다', 공지들.length > 0 && 공지들.every((값) => /^\d{4}-\d{2}-\d{2}$/.test(값.작성일)), true);
    });
  } finally {
    await 정리.모두하기();
  }
});
