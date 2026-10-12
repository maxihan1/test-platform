import { defineCase, test, verify } from '@platform/kit';

import { 내정보, 새회원으로로그인, 탈퇴, type 회원정보 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 내주문상세화면 } from './pages/my-order-detail.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-239',
  name: '없는 주문 번호로 주문 상세를 열면 「주문을 찾을 수 없습니다」가 보인다',
  techniques: ['오류 추정'],
  precondition: ['회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  let 정보: 회원정보 | undefined;
  const 상세 = new 내주문상세화면(page);

  try {
    await test.step('회원으로 로그인한다', async () => {
      await 방해막기(page);
      정보 = await 새회원으로로그인(page.request);
    });

    await test.step('회원으로 로그인했는지 확인한다', async () => {
      await verify('로그인한 회원 세션이 있다', (await 내정보(page.request)).loginId === 정보?.loginId, true, { blocker: true });
    });

    await test.step('없는 주문 번호 /my/orders/DM00000000-0000 을 연다', async () => {
      await 상세.열기('DM00000000-0000');
      await 상세.주문내역으로.waitFor();
      await verify('없는 주문 번호로 주문 상세를 열면 「주문을 찾을 수 없습니다」가 보인다', await 상세.못찾음.isVisible(), true);
    });
  } finally {
    if (정보 !== undefined) await 탈퇴(page.request);
  }
});
