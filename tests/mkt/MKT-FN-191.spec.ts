import { defineCase, test, verify } from '@platform/kit';

import { 토스트 } from './components/toast.component.js';
import { 새회원으로로그인, 탈퇴 } from './helpers/account.helper.js';
import { 세션사용자 } from './helpers/shop-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-191',
  name: '장바구니 응답이 실패하면 토스트 「잠시 후 다시 시도해 주세요」가 보인다',
  techniques: ['오류 추정'],
  precondition: ['새로 가입한 회원으로 로그인해 있다', '장바구니 응답은 가짜 응답(모킹)이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 장바구니 = new 장바구니화면(page);
  const 토스 = new 토스트(page);

  try {
    await test.step('방해 요소를 막고 새 회원으로 로그인한다', async () => {
      await 방해막기(page);
      await 새회원으로로그인(page.request);
    });

    await test.step('로그인한 회원인지 확인한다', async () => {
      await verify('로그인한 회원이 있다', (await 세션사용자(page.request)) !== null, true, { blocker: true });
    });

    const 장바구니주소 = /\/api\/cart(\?.*)?$/;

    try {
      await test.step('장바구니 응답을 실패로 바꾼다', async () => {
        await page.context().route(장바구니주소, async (route) => {
          if (route.request().method() !== 'GET') {
            await route.fallback();
            return;
          }
          await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ code: 'INTERNAL' }) });
        });
      });

      await test.step('장바구니 응답을 실패로 바꾸고 장바구니를 연다', async () => {
        await 장바구니.열기();
        await 토스.알림들.first().waitFor();
        await verify('장바구니 응답이 실패하면 토스트 「잠시 후 다시 시도해 주세요」가 보인다', await 토스.글('잠시 후 다시 시도해 주세요').first().isVisible(), true);
      });
    } finally {
      await page.context().unroute(장바구니주소);
    }
  } finally {
    await 탈퇴(page.request);
  }
});
