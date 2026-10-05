import { defineCase, test, verify } from '@platform/kit';

import { 품절상품번호 } from './components/data.component.js';
import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-093',
  name: '품절 상품 상세에는 눌리지 않는 「품절」 버튼이 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 상품상세화면(page);
  const 머리 = new 머리글(page);

  await test.step('품절 상품 상세를 연다', async () => {
    await 안내창끄기(page, { 공지: false, 설문: false });
    await 상세.열기(await 품절상품번호(page.request));
    await 상세.품절버튼.waitFor();
    await 머리.로그인링크.waitFor();
    await verify('비회원이다', await 머리.로그인링크.isVisible(), true, { blocker: true });
    await verify('품절 상품 상세에는 눌리지 않는 「품절」 버튼이 보인다', await 상세.품절버튼상태(), '「품절」 버튼 보임 · 눌리지 않음');
    const 보임 = await Promise.all([상세.장바구니담기버튼.isVisible(), 상세.바로구매버튼.isVisible()]);
    await verify('품절 상품 상세에는 「장바구니 담기」 · 「바로 구매」 버튼이 보이지 않는다', 보임, [false, false]);
  });
});
