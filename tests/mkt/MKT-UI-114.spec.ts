import { defineCase, test, verify } from '@platform/kit';

import { 아래에있나 } from './helpers/board-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-114',
  name: '게시판 목록 아래에 페이지 번호와 「이전」 · 「다음」이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);
  await 방해막기(page);

  await test.step('게시판 목록을 연다', async () => {
    await 목록.열기();
    await 목록.그려질때까지();
    const 번호가있다 = (await 목록.번호버튼들.count()) > 0;
    const 이전다음이있다 = (await 목록.이전.isVisible()) && (await 목록.다음.isVisible());
    await verify('게시판 목록 아래에 페이지 번호와 「이전」 · 「다음」이 보인다', 번호가있다 && 이전다음이있다 && (await 아래에있나(목록.표, 목록.페이저)), true);
  });
});
