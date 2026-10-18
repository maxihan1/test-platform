import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 새회원으로로그인, 회원정리, type 회원정보 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 장바구니담기 } from './helpers/data.helper.js';
import { 주문서화면 } from './pages/checkout.page.js';
import { 주소검색창 } from './pages/address-popup.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-285',
  name: '주소 검색 결과를 고르면 주소 검색 창이 닫힌다',
  platforms: ['desktop', 'mobile'],
  precondition: ['새로 가입한 회원이 상품 하나로 주문서를 열어 두었다'],
  params: z.object({
    productId: z.number().describe('담을 상품 번호 — 옵션이 없고 품절이 아니며 재고가 넉넉한 상품').default(2),
    keyword: z.string().describe('주소 검색어 — 도로명 일부, 결과가 하나 이상 나오는 글자').default('테헤란로'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 주문서 = new 주문서화면(page);
  const 상태: { 회원?: 회원정보; 고른결과?: string } = {};

  try {
    await test.step('새로 가입한 회원이 상품 하나를 담고 주문서를 연다', async () => {
      await 방해창막기(page);
      상태.회원 = await 새회원으로로그인(page.request);
      const 줄 = await 장바구니담기(page.request, params.productId);
      await 주문서.열기([줄]);
    });

    await test.step('주문서 배송 정보 단계가 열려 있는지 확인한다', async () => {
      await verify('새로 가입한 회원이 상품 하나로 주문서를 열어 두었다', await 주문서.배송정보제목.isVisible(), true, { blocker: true });
    });

    await test.step('주소 검색 창에서 「테헤란로」를 검색해 결과를 고른다', async () => {
      const [팝업쪽] = await Promise.all([page.waitForEvent('popup'), 주문서.주소검색.click()]);
      const 팝업 = new 주소검색창(팝업쪽);
      await 팝업.뜰때까지();
      await 팝업.검색하기(params.keyword);
      await 팝업.결과버튼들.first().waitFor();
      상태.고른결과 = await 팝업.결과버튼들.first().innerText();
      const 닫힘 = 팝업쪽.waitForEvent('close');
      await 팝업.결과버튼들.first().click();
      await 닫힘;
      await verify('주소 검색 결과를 고르면 주소 검색 창이 닫힌다', 팝업쪽.isClosed(), true);
    });

    await test.step('주문서의 우편번호 · 주소 칸을 확인한다', async () => {
      await 주문서.주소채워질때까지();
      await verify('주소 검색 결과를 고르면 주문서의 우편번호 · 주소 칸이 채워진다', `${await 주문서.우편번호.inputValue()}${await 주문서.주소칸.inputValue()}`, 상태.고른결과 ?? '');
    });
  } finally {
    if (상태.회원) await 회원정리(page.request, 상태.회원);
  }
});
