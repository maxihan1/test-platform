import { defineCase, test, verify } from '@platform/kit';

import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 로그인한아이디, 주문목록 } from './helpers/my-admin-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 주문내역화면 } from './pages/my-orders.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-549',
  name: '주문이 없는 회원이 주문 내역을 열면 「주문 내역이 없습니다」가 보인다',
  platforms: ['desktop', 'mobile'],
  techniques: ['경계값 분석'],
  precondition: ['주문이 없는 일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 주문내역화면(page);
  let 회원아이디 = '';

  await test.step('주문이 없는 일회용 회원으로 로그인한다', async () => {
    await 안내창막기(page);
    회원아이디 = (await 일회용회원으로로그인(page)).loginId;
    await verify('일회용 회원으로 로그인해 있다', await 로그인한아이디(page.request), 회원아이디, { blocker: true });
    await verify('이 회원의 주문이 0건이다', (await 주문목록(page.request, 'all')).length, 0, { blocker: true });
  });

  await test.step('주문 내역을 연다', async () => {
    await 화면.열기();
    await verify('주문 내역 화면이 보인다', await 화면.큰제목.isVisible(), true, { blocker: true });
    await verify('주문이 없는 회원이 주문 내역을 열면 「주문 내역이 없습니다」가 보인다', await 화면.빈안내.isVisible(), true);
  });
});
