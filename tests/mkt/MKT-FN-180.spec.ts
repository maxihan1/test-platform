import { defineCase, test, verify } from '@platform/kit';

import { 토스트 } from './components/toast.component.js';
import { 새회원으로로그인, 탈퇴 } from './helpers/account.helper.js';
import { 세션사용자, 옵션없는상품, 옵션있는상품 } from './helpers/shop-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 장바구니담기, 장바구니보기 } from './helpers/shop.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-180',
  name: '같은 상품 · 같은 옵션을 다시 담아도 장바구니 줄 수가 늘지 않는다',
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

    const 옵션상품 = await 옵션있는상품(page.request);
    const 일반상품 = await 옵션없는상품(page.request);
    const 색상 = 옵션상품.colors?.[0] ?? '';
    const 사이즈 = 옵션상품.sizes?.[0] ?? '';

    await test.step('같은 상품 · 같은 옵션을 먼저 한 번 담아 둔다', async () => {
      await 장바구니담기(page.request, { productId: 옵션상품.id, qty: 1, color: 색상, size: 사이즈 });
    });

    await test.step('장바구니에 그 상품 한 줄이 담겼는지 확인한다', async () => {
      await verify('장바구니에 상품 한 줄이 담겨 있다', (await 장바구니보기(page.request)).length, 1, { blocker: true });
    });

    await test.step('상품 상세 화면을 준비한다', async () => {
      await 상세.열기(옵션상품.id);
    });

    await test.step('상품 상세 화면이 떴는지 확인한다', async () => {
      await 상세.화면기다리기();
      await verify('상품 상세 화면에 상품 이름 제목이 보인다', await 상세.제목.isVisible(), true, { blocker: true });
    });

    await test.step('같은 상품 · 같은 옵션을 한 번 더 담는다', async () => {
      await 상세.옵션고르기(색상, 사이즈);
      await 상세.담기.click();
      await 토스.글('장바구니에 담았습니다').first().waitFor();
      await verify('같은 상품 · 같은 옵션을 다시 담아도 장바구니 줄 수가 늘지 않는다', (await 장바구니보기(page.request)).length, 1);
    });

    await test.step('같은 상품 · 같은 옵션을 수량 2로 두 번 담는다', async () => {
      await 상세.열기(일반상품.id);
      await 상세.화면기다리기();
      await 상세.늘리기.click();
      await 상세.담기.click();
      await 토스.글('장바구니에 담았습니다').first().waitFor();
      const 토스트수 = await 토스.알림들.count();
      await 상세.담기.click();
      await 토스.알림들.nth(토스트수).waitFor();
      const 줄 = (await 장바구니보기(page.request)).find((후보) => 후보.productId === 일반상품.id);
      await verify('같은 상품 · 같은 옵션을 수량 2로 두 번 담으면 장바구니 수량이 4다', 줄?.qty, 4);
    });
  } finally {
    await 탈퇴(page.request);
  }
});
