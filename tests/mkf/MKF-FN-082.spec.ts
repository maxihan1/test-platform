import { defineCase, test, verify } from '@platform/kit';

import { 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-082',
  name: '분류 탭 「후기」를 눌러도 목록 맨 위에 「공지」 표시 글이 고정되어 보인다',
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

  await test.step('분류 탭 「후기」를 누른다', async () => {
    await 목록.분류탭('후기').click();
    await 목록.선택된분류탭('후기').waitFor();
    await 목록.그려질때까지();
    await verify('분류 탭 「후기」를 눌러도 목록 맨 위에 「공지」 표시 글이 고정되어 보인다', await 목록.공지가맨위인가(), true);
  });
});
