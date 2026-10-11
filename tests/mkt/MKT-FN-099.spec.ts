import { defineCase, test, verify } from '@platform/kit';

import { 글쓴이정리하기, 글하나쓰기, 로그인해있나, 임시회원으로로그인, 정리함만들기 } from './helpers/board-tools.helper.js';
import type { 글쓴이 } from './helpers/board-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-099',
  name: '오늘 쓴 글은 목록 작성일에 「14:05」처럼 시각만 보인다',
  precondition: ['회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);
  const 정리 = 정리함만들기();
  let 나!: 글쓴이;
  let 제목 = '';
  await 방해막기(page);

  try {
    await test.step('회원으로 로그인한다', async () => {
      나 = await 임시회원으로로그인(page.request);
      정리.더하기(() => 글쓴이정리하기(나));
    });

    await test.step('로그인했는지 확인한다', async () => {
      await verify('회원으로 로그인해 있다', await 로그인해있나(page.request), true, { blocker: true });
    });

    await test.step('오늘 글을 하나 쓰고 게시판 목록을 연다', async () => {
      const 글 = await 글하나쓰기(나.api, '오늘글');
      제목 = 글.제목;
      await 목록.열기({ q: 제목 });
      await 목록.제목링크(제목).waitFor();
      const 행 = (await 목록.일반행들()).find((값) => 값.제목 === 제목);
      await verify('오늘 쓴 글은 목록 작성일에 「14:05」처럼 시각만 보인다', /^\d{2}:\d{2}$/.test(행?.작성일 ?? ''), true);
    });
  } finally {
    await 정리.모두하기();
  }
});
