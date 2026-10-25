import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 바로구매열기 } from './helpers/order.helper.js';
import { 주문하기화면 } from './pages/checkout.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-022',
  name: '새 토스트가 오면 앞 토스트는 사라지고 「연락처는 숫자 10~11자입니다」 하나만 보인다',
  platforms: ['android'],
  precondition: ['「받는 분을 입력하세요」 토스트가 떠 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    productName: z.string().describe('주문할 상품 — 품절이 아닌 상품').default('USB-C 허브'),
    receiver: z.string().describe('받는 분 — 이름 글자').default('김데모'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 목록 = new 상품목록화면(driver);
  const 주문하기 = new 주문하기화면(driver);
  const 알림 = new 토스트(driver);
  let 앞글 = '';

  await test.step('일반 회원 계정으로 로그인한다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('상품 목록이 보인다', await 목록.보이나(), true, { blocker: true });
  });

  await test.step('주문하기 화면을 연다', async () => {
    await 바로구매열기(driver, params.productName);
    await verify('주문하기 화면이 보인다', await 주문하기.보이나(), true, { blocker: true });
  });

  await test.step('받는 분을 비우고 동의한 뒤 「결제하기」를 눌러 토스트를 띄운다', async () => {
    await 주문하기.받는분적기('');
    await 주문하기.동의하기();
    await 주문하기.결제누르기();
    await 알림.뜰때까지().catch(() => undefined);
    앞글 = (await 알림.보이나()) ? await 알림.글() : '';
    await verify('「받는 분을 입력하세요」 토스트가 보인다', 앞글, '받는 분을 입력하세요', { blocker: true });
  });

  await test.step('받는 분을 적고 다시 「결제하기」를 누른다', async () => {
    await 주문하기.받는분적기(params.receiver);
    await 주문하기.결제누르기();
    await 알림.글이바뀔때까지(앞글).catch(() => undefined);
    const 하나 = await verify('토스트가 하나만 보인다', await 알림.개수(), 1);
    const 문구 = await verify(
      '토스트에 「연락처는 숫자 10~11자입니다」가 보인다',
      (await 알림.보이나()) ? await 알림.글() : '',
      '연락처는 숫자 10~11자입니다',
    );
    await verify('새 토스트가 오면 앞 토스트는 사라지고 「연락처는 숫자 10~11자입니다」 하나만 보인다', 하나 && 문구, true);
  }, { capture: true });
});
