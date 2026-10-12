import { defineCase, test, verify } from '@platform/kit';

import { 내정보, 새회원으로로그인, 탈퇴, type 회원정보 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 내주문내역화면 } from './pages/my-orders.page.js';
import { 회원탈퇴화면 } from './pages/my-withdraw.page.js';

export const spec = defineCase({
  tcId: 'MKU-UI-265',
  name: '주문 내역 화면에서는 왼쪽 메뉴 「주문 내역」이 강조되어 보인다',
  precondition: ['회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  let 정보: 회원정보 | undefined;
  const 내주문 = new 내주문내역화면(page);
  const 탈퇴화면 = new 회원탈퇴화면(page);

  try {
    await test.step('회원으로 로그인한다', async () => {
      await 방해막기(page);
      정보 = await 새회원으로로그인(page.request);
    });

    await test.step('회원으로 로그인했는지 확인한다', async () => {
      await verify('로그인한 회원 세션이 있다', (await 내정보(page.request)).loginId === 정보?.loginId, true, { blocker: true });
    });

    await test.step('주문 내역을 연다', async () => {
      await 내주문.열기();
      await verify('주문 내역 화면에서는 왼쪽 메뉴 「주문 내역」이 강조되어 보인다', await 내주문.메뉴링크('주문 내역').getAttribute('aria-current'), 'page');
    });

    await test.step('회원 탈퇴 화면을 연다', async () => {
      await 탈퇴화면.열기();
      await verify('회원 탈퇴 화면에서는 왼쪽 메뉴 「회원 탈퇴」가 강조되어 보인다', await 탈퇴화면.메뉴링크('회원 탈퇴').getAttribute('aria-current'), 'page');
    });
  } finally {
    if (정보 !== undefined) await 탈퇴(page.request);
  }
});
