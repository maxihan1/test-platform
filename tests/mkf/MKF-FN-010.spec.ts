import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 경로, 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-010',
  name: '게시판 목록에서 로고를 누르면 홈 화면으로 간다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 머리 = new 머리글(page);
  const 목록 = new 게시판목록화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('게시판 목록이 열렸는지 확인한다', async () => {
    await 방해막기(page);
    await page.goto('/board');
    await 목록.제목.waitFor();
    await verify('게시판 목록 화면이 열려 있다', 경로(page), '/board', { blocker: true });
  });

  await test.step('게시판 목록에서 머리글 로고 「데모마켓」을 누른다', async () => {
    await 머리.로고.click();
    await 목록.제목.waitFor({ state: 'detached' });
    await 머리.로고.waitFor();
    await verify('게시판 목록에서 로고를 누르면 홈 화면으로 간다', 경로(page), '/');
  });
});
