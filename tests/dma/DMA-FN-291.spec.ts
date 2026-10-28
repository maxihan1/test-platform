import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하고주문하기열기 } from './helpers/checkout-flow.helper.js';
import { 주문하기화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-291',
  name: '「주문 내용을 확인했으며 결제에 동의합니다」를 체크하지 않으면 「결제하기」 버튼이 눌리지 않는다',
  platforms: ['android'],
  techniques: ['결정 테이블'],
  precondition: ['일반 회원 계정으로 로그인해 있다', '주문하기 화면이 떠 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    상품이름: z.string().describe('주문할 상품 이름 — 옵션이 없고 품절이 아닌 상품').default('USB-C 허브'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 주문하기 = new 주문하기화면(driver);

  await test.step('일반 회원 계정으로 로그인해 주문하기 화면을 연다', async () => {
    await 로그인하고주문하기열기(driver, params.loginId, params.loginPassword, params.상품이름);
  });

  await test.step('주문하기 화면을 확인한다', async () => {
    await verify('주문하기 화면이 떠 있다', await 주문하기.보이나(), true, { blocker: true });
  });

  await test.step('동의 체크박스를 켜지 않는다', async () => {
    await 주문하기.동의칸보이게();
    await verify('동의 체크박스가 꺼져 있다', await 주문하기.동의했나(), false);
    await verify(
      '「주문 내용을 확인했으며 결제에 동의합니다」를 체크하지 않으면 「결제하기」 버튼이 눌리지 않는다',
      await 주문하기.결제버튼눌리나(),
      false,
    );
  }, { capture: true });
});
