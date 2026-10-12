import { defineCase, test, verify } from '@platform/kit';

import { 안내화면 } from './components/notice-screen.component.js';
import { 새회원으로로그인, 탈퇴 } from './helpers/account.helper.js';
import { 세션사용자, 옵션없는상품 } from './helpers/shop-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-185',
  name: '「바로 구매」를 누르면 그 상품만 담긴 주문서로 간다',
  precondition: ['새로 가입한 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 상품상세화면(page);

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

    await test.step('상품 상세에서 「바로 구매」를 누른다', async () => {
      await 상세.바로구매.click();
      await new 안내화면(page).제목글('주문서').waitFor();
      const 주소 = new URL(page.url());
      const 담긴것 = JSON.parse(주소.searchParams.get('direct') ?? 'null') as { productId?: number } | null;
      await verify('「바로 구매」를 누르면 그 상품만 담긴 주문서로 간다', 주소.pathname === '/checkout' && 담긴것?.productId === 상품.id, true);
    });
  } finally {
    await 탈퇴(page.request);
  }
});
