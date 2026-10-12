import { defineCase, test, verify } from '@platform/kit';

import { 토스트 } from './components/toast.component.js';
import { 새회원으로로그인, 탈퇴 } from './helpers/account.helper.js';
import { 세션사용자, 옵션없는상품 } from './helpers/shop-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-293',
  name: '담기 응답이 1.5초 늦어도 응답 전까지 「장바구니 담기」 버튼이 눌리지 않는다',
  precondition: ['새로 가입한 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 상품상세화면(page);
  const 토스 = new 토스트(page);

  try {
    await test.step('방해 요소를 막고 새 회원으로 로그인한다', async () => {
      await 방해막기(page);
      await 새회원으로로그인(page.request);
    });

    await test.step('로그인한 회원인지 확인한다', async () => {
      await verify('로그인한 회원이 있다', (await 세션사용자(page.request)) !== null, true, { blocker: true });
    });

    const 상품 = await 옵션없는상품(page.request);
    await test.step('상품 상세 화면을 준비한다', async () => {
      await 상세.열기(상품.id);
    });

    await test.step('상품 상세 화면이 떴는지 확인한다', async () => {
      await 상세.화면기다리기();
      await verify('상품 상세 화면에 상품 이름 제목이 보인다', await 상세.제목.isVisible(), true, { blocker: true });
    });
    const 담기주소 = /\/api\/cart$/;

    try {
      await test.step('장바구니 담기 응답을 1.5초 늦춘다', async () => {
        await page.context().route(담기주소, async (route) => {
          if (route.request().method() === 'POST') await new Promise((끝) => setTimeout(끝, 1500));
          await route.continue();
        });
      });

      await test.step('담기 응답을 1.5초 늦춘 채 「장바구니 담기」를 누른다', async () => {
        await 상세.담기.click();
        await verify('담기 응답이 1.5초 늦어도 응답 전까지 「장바구니 담기」 버튼이 눌리지 않는다', await 상세.담기처리중.isDisabled(), true);
        await 토스.글('장바구니에 담았습니다').first().waitFor();
      });
    } finally {
      await page.context().unroute(담기주소);
    }
  } finally {
    await 탈퇴(page.request);
  }
});
