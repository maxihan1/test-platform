import { defineCase, test, verify } from '@platform/kit';

import { 토스트 } from './components/toast.component.js';
import { 새회원으로로그인, 탈퇴 } from './helpers/account.helper.js';
import { 세션사용자, 옵션있는상품 } from './helpers/shop-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 장바구니보기 } from './helpers/shop.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-174',
  name: '색상과 사이즈를 모두 고르고 담으면 장바구니에 그 옵션 줄이 생긴다',
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

    const 상품 = await 옵션있는상품(page.request);
    const 색상 = 상품.colors?.[0] ?? '';
    const 사이즈 = 상품.sizes?.[0] ?? '';
    await test.step('상품 상세 화면을 준비한다', async () => {
      await 상세.열기(상품.id);
    });

    await test.step('상품 상세 화면이 떴는지 확인한다', async () => {
      await 상세.화면기다리기();
      await verify('상품 상세 화면에 상품 이름 제목이 보인다', await 상세.제목.isVisible(), true, { blocker: true });
    });

    await test.step('옵션이 있는 상품에서 색상과 사이즈를 모두 고르고 「장바구니 담기」를 누른다', async () => {
      await 상세.옵션고르기(색상, 사이즈);
      await 상세.담기.click();
      await 토스.글('장바구니에 담았습니다').first().waitFor();
      const 줄들 = await 장바구니보기(page.request);
      await verify('색상과 사이즈를 모두 고르고 담으면 장바구니에 그 옵션 줄이 생긴다', 줄들.some((줄) => 줄.productId === 상품.id && 줄.color === 색상 && 줄.size === 사이즈), true);
    });
  } finally {
    await 탈퇴(page.request);
  }
});
