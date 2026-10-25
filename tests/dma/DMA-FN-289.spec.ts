import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 금액글 } from './helpers/app.helper.js';
import { 로그인하고주문하기열기 } from './helpers/checkout-flow.helper.js';
import { 주문하기화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-289',
  name: '동의를 체크하면 「{최종 결제 금액} 결제하기」 버튼이 눌린다',
  platforms: ['android'],
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

  await test.step('동의 체크박스를 켠다', async () => {
    await 주문하기.동의하기();
    const 눌림 = await verify('「결제하기」 버튼이 눌린다', await 주문하기.결제버튼눌리나(), true);
    const 글 = await verify(
      '버튼 글이 「{최종 결제 금액} 결제하기」다',
      await 주문하기.결제버튼글(),
      `${금액글(await 주문하기.최종결제금액값())} 결제하기`,
    );
    await verify('동의를 체크하면 「{최종 결제 금액} 결제하기」 버튼이 눌린다', 눌림 && 글, true);
  }, { capture: true });
});
