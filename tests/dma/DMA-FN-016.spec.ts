import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { 장바구니열기, 목록으로돌아가기, 상품상세열기, 장바구니줄지우기 } from './helpers/cart.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-016',
  name: '「장바구니 담기」를 누르면 처리 결과가 화면 아래쪽 토스트로 보인다',
  platforms: ['android'],
  precondition: ['담을 상품이 장바구니에 없다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    productName: z.string().describe('옵션 없는 상품 — 옵션이 없고 품절이 아닌 상품').default('USB-C 허브'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 목록 = new 상품목록화면(driver);
  const 알림 = new 토스트(driver);

  try {
    await test.step('일반 회원 계정으로 로그인한다', async () => {
      await 로그인하기(driver, params.loginId, params.loginPassword);
      await verify('상품 목록이 보인다', await 목록.보이나(), true, { blocker: true });
    });

    await test.step('담을 상품을 장바구니에서 지운다', async () => {
      await 장바구니줄지우기(driver, params.productName);
    });

    await test.step('담을 상품이 장바구니에 없는지 확인한다', async () => {
      const 장바구니 = await 장바구니열기(driver);
      await verify('담을 상품이 장바구니에 없다', (await 장바구니.줄찾기(params.productName)) === undefined, true, { blocker: true });
      await 목록으로돌아가기(driver);
    });

    await test.step('옵션 없는 상품 상세에서 「장바구니 담기」를 누른다', async () => {
      const 상세 = await 상품상세열기(driver, params.productName);
      await verify('상품 상세에 옵션이 없다', !(await 상세.옵션있나()), true, { blocker: true });
      await 상세.담기();
      await 알림.뜰때까지().catch(() => undefined);
      const 보임 = await verify('처리 결과 토스트가 보인다', await 알림.보이나(), true);
      const 아래쪽 = await verify('토스트가 화면 아래쪽에 있다', 보임 && (await 알림.화면아래쪽인가()), true);
      await verify('「장바구니 담기」를 누르면 처리 결과가 화면 아래쪽 토스트로 보인다', 보임 && 아래쪽, true);
    }, { capture: true });
  } finally {
    await 장바구니줄지우기(driver, params.productName);
  }
});
