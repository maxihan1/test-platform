import { defineCase, test, verify } from '@platform/kit';

import { 상품번호, 상품조회 } from './components/data.component.js';
import { 원 } from './components/shop-helpers.component.js';
import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-268',
  name: '수량을 2로 늘리면 「총 상품 금액」이 판매가의 2배로 바로 바뀐다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 상품상세화면(page);
  const 머리 = new 머리글(page);
  const 상품 = await 상품조회(page.request, 상품번호.니트가디건);

  await test.step('상품 상세를 연다', async () => {
    await 안내창끄기(page, { 공지: false, 설문: false });
    await 상세.열기(상품.id);
    await 상세.수량칸.waitFor();
    await 머리.로그인링크.waitFor();
    await verify('비회원이다', await 머리.로그인링크.isVisible(), true, { blocker: true });
  });

  await test.step('상품 상세에서 수량 「+」를 누른다', async () => {
    await 상세.수량늘리기.click();
    await verify('수량을 2로 늘리면 「총 상품 금액」이 판매가의 2배로 바로 바뀐다', await 상세.총상품금액.innerText(), 원(상품.salePrice * 2));
  });
});
