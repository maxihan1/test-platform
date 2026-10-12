import { defineCase, test, verify } from '@platform/kit';

import { 토스트 } from './components/toast.component.js';
import { 내정보, 새회원으로로그인, 탈퇴, type 회원정보 } from './helpers/account.helper.js';
import { 주문목록실패모킹 } from './helpers/order-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 내주문내역화면 } from './pages/my-orders.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-236',
  name: '주문 목록 응답이 실패하면 「잠시 후 다시 시도해 주세요」 안내가 보인다',
  techniques: ['오류 추정'],
  precondition: ['주문 목록 응답은 가짜 응답(모킹)이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 내주문 = new 내주문내역화면(page);
  const 토스 = new 토스트(page);
  let 정보: 회원정보 | undefined;

  try {
    await test.step('임시 회원으로 가입해 로그인한다', async () => {
      await 방해막기(page);
      정보 = await 새회원으로로그인(page.request);
    });

    await test.step('임시 회원으로 로그인했는지 확인한다', async () => {
      await verify('임시 회원으로 로그인해 있다', (await 내정보(page.request)).loginId === 정보?.loginId, true, { blocker: true });
    });

    await test.step('주문 목록 응답을 500 으로 준 채 주문 내역을 연다', async () => {
      const 해제 = await 주문목록실패모킹(page);
      try {
        const 응답 = page.waitForResponse(/\/api\/orders(\?.*)?$/);
        await page.goto(내주문내역화면.주소);
        await 응답;
        await 내주문.제목.waitFor();
        await 토스.알림들.first().waitFor();
        await verify('주문 목록 응답이 실패하면 「잠시 후 다시 시도해 주세요」 안내가 보인다', await 내주문.오류안내.isVisible(), true);
      } finally {
        await 해제();
      }
    });
  } finally {
    await 탈퇴(page.request);
  }
});
