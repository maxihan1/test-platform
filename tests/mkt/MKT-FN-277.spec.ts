import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 새회원으로로그인, 회원정리, type 회원정보 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 장바구니담기 } from './helpers/data.helper.js';
import { 기본배송정보 } from './helpers/shop.helper.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-277',
  name: '연락처 10자면 결제 수단 단계로 간다',
  platforms: ['desktop', 'mobile'],
  precondition: ['새로 가입한 회원이 상품 하나로 주문서를 열어 두었다'],
  techniques: ['경계값 분석'],
  params: z.object({
    productId: z.number().describe('담을 상품 번호 — 옵션이 없고 품절이 아니며 재고가 넉넉한 상품').default(2),
    shortPhone: z.string().describe('연락처 최소 길이 — 숫자 10자').default('0101234567'),
    longPhone: z.string().describe('연락처 최대 길이 — 숫자 11자').default('01012345678'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 주문서 = new 주문서화면(page);
  const 상태: { 회원?: 회원정보 } = {};

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

    await test.step('연락처 10자로 배송 정보를 채우고 「다음」을 누른다', async () => {
      await 주문서.배송정보채우기({ ...기본배송정보(), 연락처: params.shortPhone });
      await 주문서.다음누르기();
      await 주문서.결제수단제목.waitFor();
      await verify('연락처 10자면 결제 수단 단계로 간다', await 주문서.현재단계.innerText(), '② 결제 수단');
    });

    await test.step('연락처 11자로 배송 정보를 채우고 「다음」을 누른다', async () => {
      await 주문서.이전.click();
      await 주문서.배송정보제목.waitFor();
      await 주문서.연락처.fill(params.longPhone);
      await 주문서.다음누르기();
      await 주문서.결제수단제목.waitFor();
      await verify('연락처 11자면 결제 수단 단계로 간다', await 주문서.현재단계.innerText(), '② 결제 수단');
    });
  } finally {
    if (상태.회원) await 회원정리(page.request, 상태.회원);
  }
});
