import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 기기오늘, 며칠뒤, 월일글 } from './helpers/app.helper.js';
import { 로그인하고주문하기열기 } from './helpers/checkout-flow.helper.js';
import { 주문하기화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'DMA-UI-089',
  name: '배송 희망일 칩은 오늘로부터 2일 뒤부터 14일 뒤까지 「10-22」 꼴로 보인다',
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

  await test.step('배송 희망일 칩을 끝까지 밀며 읽는다', async () => {
    const 오늘 = await 기기오늘(driver);
    const 기대 = Array.from({ length: 13 }, (_, 번) => 월일글(며칠뒤(오늘, 번 + 2)));
    await verify(
      '배송 희망일 칩은 오늘로부터 2일 뒤부터 14일 뒤까지 「10-22」 꼴로 보인다',
      (await 주문하기.날짜칩글모두()).join(', '),
      기대.join(', '),
    );
  }, { capture: true });
});
