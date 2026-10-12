import { defineCase, test, verify } from '@platform/kit';

import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-093',
  name: '마지막 페이지로 가면 「다음」이 눌리지 않는다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);
  await 방해막기(page);

  await test.step('게시판 목록 화면을 연다', async () => {
    await 목록.열기();
  });

  await test.step('게시판 목록 화면이 열렸는지 확인한다', async () => {
    await 목록.그려질때까지();
    await verify('게시판 목록 화면이 열려 있다', await 목록.제목.isVisible(), true, { blocker: true });
  });

  await test.step('게시판 목록 마지막 페이지로 간다', async () => {
    await 목록.번호버튼들.last().click();
    await 목록.그려질때까지();
    await verify('마지막 페이지로 가면 「다음」이 눌리지 않는다', await 목록.다음.isDisabled(), true);
  });
});
