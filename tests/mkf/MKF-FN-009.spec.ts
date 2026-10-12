import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 세션아이디 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 게시판목록화면 } from './pages/board-list.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-009',
  name: '하위 메뉴 「질문게시판」을 누르면 분류 탭 「질문」이 선택된 게시판 목록이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 머리 = new 머리글(page);
  const 목록 = new 게시판목록화면(page);
  const 홈 = new 홈화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('홈이 열렸는지 확인한다', async () => {
    await 방해막기(page);
    await 홈.열기();
    await 머리.로그인.waitFor();
    await verify('머리글 「커뮤니티」 메뉴가 보인다', await 머리.커뮤니티.isVisible(), true, { blocker: true });
  });

  await test.step('홈에서 「커뮤니티」 하위 메뉴 「질문게시판」을 누른다', async () => {
    await 머리.커뮤니티.hover();
    await 머리.하위메뉴항목('질문게시판').click();
    await 목록.그려질때까지();
    await verify('하위 메뉴 「질문게시판」을 누르면 분류 탭 「질문」이 선택된 게시판 목록이 보인다', await 목록.선택된분류탭('질문').isVisible(), true);
  });
});
