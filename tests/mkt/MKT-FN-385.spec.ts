import { defineCase, test, verify } from '@platform/kit';

import { 세션사용자 } from './helpers/shop-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-385',
  name: '비회원이 「장바구니 담기」를 누르면 로그인 화면으로 간다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 상품상세화면(page);
  const 로그인 = new 로그인화면(page);

  await test.step('방해 요소를 막는다', async () => {
    await 방해막기(page);
  });

  await test.step('로그인하지 않은 상태인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', (await 세션사용자(page.request)) === null, true, { blocker: true });
  });

  await test.step('상품 상세에서 「장바구니 담기」를 누른다', async () => {
    await 상세.열기(1);
    await 상세.화면기다리기();
    await 상세.담기.click();
    await 로그인.제목.waitFor();
    await verify('비회원이 「장바구니 담기」를 누르면 로그인 화면으로 간다', [new URL(page.url()).pathname, await 로그인.제목.isVisible()], ['/login', true]);
  });

  await test.step('상품 상세에서 「바로 구매」를 누른다', async () => {
    await 상세.열기(1);
    await 상세.화면기다리기();
    await 상세.바로구매.click();
    await 로그인.제목.waitFor();
    await verify('비회원이 「바로 구매」를 누르면 로그인 화면으로 간다', [new URL(page.url()).pathname, await 로그인.제목.isVisible()], ['/login', true]);
  });
});
