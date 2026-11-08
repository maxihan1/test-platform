import { defineCase, test, verify } from '@platform/kit';

import { 로그인한아이디 } from './helpers/my-admin-tools.helper.js';
import { 넉넉한상품 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-547',
  name: '비회원이 상품 상세에서 「장바구니 담기」를 누르면 로그인 화면으로 간다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 상세 = new 상품상세화면(page);
  const 로그인 = new 로그인화면(page);
  const 상품 = await 넉넉한상품(request, true);
  await 안내창막기(page);

  await test.step('비회원으로 상품 상세를 연다', async () => {
    await 상세.열기(상품.id);
    await verify('비회원이다', await 로그인한아이디(page.request), null, { blocker: true });
    await verify('상품 상세에 상품 이름이 보인다', await 상세.제목.innerText(), 상품.name, { blocker: true });
  });

  await test.step('상품 상세에서 옵션을 고르고 「장바구니 담기」를 누른다', async () => {
    await 상세.옵션고르기(상품.colors[0] ?? '', 상품.sizes[0] ?? '');
    await 상세.담기();
    await 로그인.아이디.waitFor();
    await verify('비회원이 상품 상세에서 「장바구니 담기」를 누르면 로그인 화면으로 간다', await 로그인.큰제목.isVisible(), true);
  });
});
