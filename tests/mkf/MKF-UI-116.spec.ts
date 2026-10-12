import { defineCase, test, verify } from '@platform/kit';

import { 아래에있나 } from './helpers/board-tools.helper.js';
import { 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 마지막쪽번호 } from './helpers/board-extra.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKF-UI-116',
  name: '게시판 1쪽 아래에 쪽 번호와 「이전」 · 「다음」이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('게시판 목록 1쪽을 연다', async () => {
    await 방해막기(page);
    await 목록.열기();
    await 목록.그려질때까지();
    const 번호가있다 = (await 목록.번호버튼들.count()) > 0;
    const 이전다음이있다 = (await 목록.이전.isVisible()) && (await 목록.다음.isVisible());
    await verify('게시판 1쪽 아래에 쪽 번호와 「이전」 · 「다음」이 보인다', 번호가있다 && 이전다음이있다 && (await 아래에있나(목록.표, 목록.페이저)), true);
    await verify('게시판 1쪽에서 「이전」은 눌리지 않는다', (await 목록.이전.isVisible()) && (await 목록.이전.isDisabled()), true);
  });

  await test.step('게시판 목록 마지막 쪽을 연다', async () => {
    await 목록.열기({ page: await 마지막쪽번호(page.request) });
    await 목록.그려질때까지();
    await verify('게시판 마지막 쪽에서 「다음」은 눌리지 않는다', (await 목록.다음.isVisible()) && (await 목록.다음.isDisabled()), true);
  });
});
