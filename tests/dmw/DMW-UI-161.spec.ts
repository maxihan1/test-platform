import { defineCase, test, verify } from '@platform/kit';

import { 품절상품 } from './helpers/data.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-161',
  name: '품절 상품 상세에 눌리지 않는 「품절」 버튼이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 상세 = new 상품상세화면(page);
  const 상품 = await 품절상품(request);
  await 안내창막기(page);

  await test.step('품절 상품 상세를 연다', async () => {
    await 상세.열기(상품.id);
    await verify('상품 상세에 상품 이름이 보인다', await 상세.제목.innerText(), 상품.name, { blocker: true });
    const 보임 = await verify('「품절」 버튼이 보인다', await 상세.품절버튼.isVisible(), true);
    const 눌림없음 = await verify('「품절」 버튼이 눌리지 않는다', await 상세.품절버튼.isDisabled(), true);
    await verify('품절 상품 상세에 눌리지 않는 「품절」 버튼이 보인다', 보임 && 눌림없음, true);
  });

  await test.step('품절 상품 상세의 구매 버튼을 확인한다', async () => {
    const 담기 = await verify('「장바구니 담기」가 보이지 않는다', await 상세.장바구니담기.isVisible(), false);
    const 구매 = await verify('「바로 구매」가 보이지 않는다', await 상세.바로구매.isVisible(), false);
    await verify('품절 상품 상세에는 「장바구니 담기」 · 「바로 구매」가 보이지 않는다', 담기 && 구매, true);
  });
});
