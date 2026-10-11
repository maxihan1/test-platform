import { defineCase, test, verify } from '@platform/kit';

import { 토스트 } from './components/toast.component.js';
import { 새회원으로로그인, 탈퇴 } from './helpers/account.helper.js';
import { 세션사용자, 옵션없는상품 } from './helpers/shop-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 장바구니보기 } from './helpers/shop.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-181',
  name: '같은 상품을 수량 10까지 담으면 장바구니 수량이 10이다',
  techniques: ['경계값 분석'],
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

    await test.step('같은 상품을 수량 10으로 담는다', async () => {
      await 상세.수량적기('10');
      await 상세.담기.click();
      await 토스.글('장바구니에 담았습니다').first().waitFor();
      const 줄 = (await 장바구니보기(page.request)).find((후보) => 후보.productId === 상품.id);
      await verify('같은 상품을 수량 10까지 담으면 장바구니 수량이 10이다', 줄?.qty, 10);
    });

    await test.step('수량 10이 담긴 상품을 수량 1로 한 번 더 담는다', async () => {
      await 토스.알림들.first().waitFor({ state: 'detached' });
      await 상세.수량적기('1');
      await 상세.담기.click();
      await 토스.알림들.first().waitFor();
      const 줄 = (await 장바구니보기(page.request)).find((후보) => 후보.productId === 상품.id);
      await verify('수량 10이 담긴 상품을 한 번 더 담아도 장바구니 수량이 11이 되지 않는다', (줄?.qty ?? 0) < 11, true);
    });
  } finally {
    await 탈퇴(page.request);
  }
});
