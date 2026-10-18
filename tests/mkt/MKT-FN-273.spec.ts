import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 새회원으로로그인, 회원정리, type 회원정보 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 장바구니담기 } from './helpers/data.helper.js';
import { 기본배송정보 } from './helpers/shop.helper.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-273',
  name: '결제 수단 단계에서 「이전」으로 돌아가면 받는 분 · 연락처 · 상세 주소가 적은 그대로 남아 있다',
  platforms: ['desktop', 'mobile'],
  precondition: ['새로 가입한 회원이 상품 하나로 주문서를 열어 두었다'],
  params: z.object({
    productId: z.number().describe('담을 상품 번호 — 옵션이 없고 품절이 아니며 재고가 넉넉한 상품').default(2),
    receiver: z.string().describe('받는 분 이름').default('홍길동'),
    phone: z.string().describe('연락처 — 숫자 10~11자').default('01012345678'),
    detail: z.string().describe('상세 주소').default('101호'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 주문서 = new 주문서화면(page);
  const 상태: { 회원?: 회원정보 } = {};

  try {
    await test.step('새로 가입한 회원이 상품 하나로 주문서의 결제 수단 단계까지 간다', async () => {
      await 방해창막기(page);
      상태.회원 = await 새회원으로로그인(page.request);
      const 줄 = await 장바구니담기(page.request, params.productId);
      await 주문서.열기([줄]);
      await 주문서.결제수단단계로가기({ ...기본배송정보(), 받는분: params.receiver, 연락처: params.phone, 상세주소: params.detail });
    });

    await test.step('주문서 결제 수단 단계가 열려 있는지 확인한다', async () => {
      await verify('새로 가입한 회원이 상품 하나로 주문서를 열어 두었다', await 주문서.결제수단제목.isVisible(), true, { blocker: true });
    });

    await test.step('결제 수단 단계에서 「이전」을 누른다', async () => {
      await 주문서.이전.click();
      await 주문서.배송정보제목.waitFor();
      const 남은값 = [await 주문서.받는분.inputValue(), await 주문서.연락처.inputValue(), await 주문서.상세주소.inputValue()];
      await verify('결제 수단 단계에서 「이전」으로 돌아가면 받는 분 · 연락처 · 상세 주소가 적은 그대로 남아 있다', 남은값.join(' / '), [params.receiver, params.phone, params.detail].join(' / '));
    });
  } finally {
    if (상태.회원) await 회원정리(page.request, 상태.회원);
  }
});
