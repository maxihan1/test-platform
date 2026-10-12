import { defineCase, test, verify } from '@platform/kit';

import { 토스트 } from './components/toast.component.js';
import { 새회원으로로그인 } from './helpers/account.helper.js';
import { 조회실패모킹 } from './helpers/checkout-flow.helper.js';
import { 임시회원치우기 } from './helpers/shop-extra.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 기다려보기, 세션사용자 } from './helpers/shop-tools.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-162',
  name: '장바구니 응답이 서버 오류면 「잠시 후 다시 시도해 주세요」가 보인다',
  techniques: ['오류 추정'],
  precondition: ['장바구니 응답은 서버 오류 500 가짜 응답(모킹)이다'],
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

    const 모킹 = await 조회실패모킹(page, /\/api\/cart(\?.*)?$/);
    try {
      await test.step('장바구니를 연다', async () => {
        await 장바구니.열기();
        await 기다려보기(토스.글('잠시 후 다시 시도해 주세요').first().waitFor({ timeout: 10000 }));
        await verify('장바구니 요청이 가짜 응답으로 돌아갔다', 모킹.걸린수() > 0, true, { blocker: true });
        await verify('장바구니 응답이 서버 오류면 「잠시 후 다시 시도해 주세요」가 보인다', await 토스.글('잠시 후 다시 시도해 주세요').first().isVisible(), true);
      });
    } finally {
      await 모킹.풀기();
    }
  } finally {
    await 임시회원치우기(page.request);
  }
});
