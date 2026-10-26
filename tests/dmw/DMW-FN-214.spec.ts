import { defineCase, test, verify } from '@platform/kit';

import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 장바구니비우기 } from './helpers/data.helper.js';
import { 넉넉한상품, 상품담기, 장바구니줄읽기 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-214',
  name: '같은 상품 · 같은 옵션을 다시 담으면 장바구니 줄이 늘지 않고 수량이 더해진다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 상세 = new 상품상세화면(page);
  const 상품 = await 넉넉한상품(request, true);
  await 안내창막기(page);
  await 일회용회원으로로그인(page);

  try {
    await test.step('같은 상품 · 같은 옵션을 한 번 더 담는다', async () => {
      await 상품담기(page.request, 상품, 1);
      await 상세.열기(상품.id);
      await verify('상품 상세에 상품 이름이 보인다', await 상세.제목.innerText(), 상품.name, { blocker: true });
      await verify('장바구니에 같은 상품이 한 줄 담겨 있다', (await 장바구니줄읽기(page.request)).length, 1, { blocker: true });
      await 상세.옵션고르기(상품.colors[0], 상품.sizes[0]);
      const 응답 = page.waitForResponse((r) => r.url().endsWith('/api/cart') && r.request().method() === 'POST');
      await 상세.담기();
      await 응답;
      const 줄 = await 장바구니줄읽기(page.request);
      const 줄수 = await verify('장바구니 줄이 늘지 않는다', 줄.length, 1);
      const 수량 = await verify('장바구니 줄 수량이 2다', 줄.map((하나) => 하나.qty).join(', '), '2');
      await verify('같은 상품 · 같은 옵션을 다시 담으면 장바구니 줄이 늘지 않고 수량이 더해진다', 줄수 && 수량, true);
    });
  } finally {
    await 장바구니비우기(page.request);
  }
});
