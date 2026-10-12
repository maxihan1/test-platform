import { defineCase, test, verify } from '@platform/kit';

import { 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-083',
  name: '제목 조건으로 「데모」를 검색하면 공지를 뺀 모든 글 제목에 「데모」가 들어 있다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('게시판 목록 화면이 열렸는지 확인한다', async () => {
    await 방해막기(page);
    await 목록.열기();
    await 목록.그려질때까지();
    await verify('게시판 목록 화면이 열려 있다', await 목록.제목.isVisible(), true, { blocker: true });
  });

  await test.step('검색 조건 「제목」에 검색어 「데모」를 넣고 검색한다', async () => {
    await 목록.검색하기('제목', '데모');
    await 목록.그려질때까지();
    const 제목들 = (await 목록.일반행들()).map((행) => 행.제목);
    await verify('제목 조건으로 「데모」를 검색하면 공지를 뺀 모든 글 제목에 「데모」가 들어 있다', 제목들.length > 0 && 제목들.every((글) => 글.includes('데모')), true);
  });
});
