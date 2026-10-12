import { defineCase, test, verify } from '@platform/kit';

import { 내정보, 새회원으로로그인, 탈퇴, type 회원정보 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 내주문내역화면 } from './pages/my-orders.page.js';

export const spec = defineCase({
  tcId: 'MKF-UI-241',
  name: '주문 내역 기간 버튼은 「1개월」 · 「3개월」 · 「전체」이고 처음에 「3개월」이 골라져 있다',
  precondition: ['회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  let 정보: 회원정보 | undefined;
  const 내주문 = new 내주문내역화면(page);

  try {
    await test.step('회원으로 로그인한다', async () => {
      await 방해막기(page);
      정보 = await 새회원으로로그인(page.request);
    });

    await test.step('회원으로 로그인했는지 확인한다', async () => {
      await verify('회원으로 로그인해 있다', (await 내정보(page.request)).loginId === 정보?.loginId, true, { blocker: true });
    });

    await test.step('마이페이지 주문 내역을 연다', async () => {
      await 내주문.열기();
      await verify(
        '주문 내역 기간 버튼은 「1개월」 · 「3개월」 · 「전체」이고 처음에 「3개월」이 골라져 있다',
        [await 내주문.기간버튼들.allInnerTexts(), await 내주문.기간버튼('3개월').getAttribute('aria-pressed')],
        [['1개월', '3개월', '전체'], 'true'],
      );
    });
  } finally {
    if (정보 !== undefined) await 탈퇴(page.request);
  }
});
