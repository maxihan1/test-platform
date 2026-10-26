import { defineCase, test, verify } from '@platform/kit';

import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 넉넉한상품 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 주문서화면 } from './pages/checkout.page.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-216',
  name: '「바로 구매」를 누르면 그 상품만 담긴 주문서가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 상세 = new 상품상세화면(page);
  const 주문서 = new 주문서화면(page);
  const 상품 = await 넉넉한상품(request, true);
  await 안내창막기(page);
  await 일회용회원으로로그인(page);

  await test.step('옵션을 고르고 「바로 구매」를 누른다', async () => {
    await 상세.열기(상품.id);
    await verify('상품 상세에 상품 이름이 보인다', await 상세.제목.innerText(), 상품.name, { blocker: true });
    await 상세.옵션고르기(상품.colors[0], 상품.sizes[0]);
    await 상세.바로구매.click();
    await 주문서.다그려질때까지();
    const 제목 = await verify('주문서가 보인다', await 주문서.제목.isVisible(), true);
    const 비지않음 = await verify('「주문할 상품이 없습니다」가 보이지 않는다', await 주문서.비었음안내.isVisible(), false);
    const 직접 = JSON.parse(new URL(page.url()).searchParams.get('direct') ?? '{}') as { productId?: number };
    const 그상품 = await verify('주문서에 그 상품 하나가 담긴다', 직접.productId, 상품.id);
    await verify('「바로 구매」를 누르면 그 상품만 담긴 주문서가 보인다', 제목 && 비지않음 && 그상품, true);
  });
});
