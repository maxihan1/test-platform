import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고정오늘, 날짜뒤, 장바구니로주문서열기, 정상배송입력 } from './helpers/shop.helper.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-101',
  name: '배송 희망일 날짜 선택기에서 1일 뒤 날짜는 고를 수 없다',
  platforms: ['desktop'],
  precondition: ['오늘이 2026-10-12 월요일이다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 주문서 = new 주문서화면(page);
  const 입력 = 정상배송입력(고정오늘);

  await test.step('오늘을 2026-10-12 월요일로 정한다', async () => {
    await page.clock.setFixedTime(고정오늘);
  });

  await test.step('회원으로 로그인해 장바구니 상품으로 주문서를 연다', async () => {
    await 장바구니로주문서열기(page, params.loginId ?? '', params.password ?? '');
  });

  await test.step('주문서 배송 정보 단계를 확인한다', async () => {
    await verify('오늘이 2026-10-12 이다', await 주문서.브라우저오늘(), '2026-10-12', { blocker: true });
    await verify('주문서 「① 배송 정보」 단계가 보인다', await 주문서.지금단계.innerText(), '① 배송 정보', { blocker: true });
  });

  await test.step('배송 희망일 날짜 선택기를 연다', async () => {
    const 가장이른날 = (await 주문서.희망일.getAttribute('min')) ?? '';
    await verify('배송 희망일 날짜 선택기에서 1일 뒤 날짜는 고를 수 없다', 가장이른날 > 날짜뒤(1, 고정오늘), true);
  });

  await test.step('배송 희망일로 2일 뒤 날짜를 고르고 「다음」 을 누른다', async () => {
    await 주문서.배송정보채우기({ ...입력, 희망일: 날짜뒤(2, 고정오늘) });
    await 주문서.다음누르기();
    await 주문서.결제수단단계.waitFor();
    await verify('배송 희망일로 2일 뒤 날짜를 고르면 결제 수단 단계로 넘어간다', await 주문서.결제수단단계.isVisible(), true);
  });

  await test.step('배송 희망일로 14일 뒤 날짜를 고르고 「다음」 을 누른다', async () => {
    await 주문서.이전누르기();
    await 주문서.받는분.waitFor();
    await 주문서.배송정보채우기({ ...입력, 희망일: 날짜뒤(14, 고정오늘) });
    await 주문서.다음누르기();
    await 주문서.결제수단단계.waitFor();
    await verify('배송 희망일로 14일 뒤 날짜를 고르면 결제 수단 단계로 넘어간다', await 주문서.결제수단단계.isVisible(), true);
  });

  await test.step('배송 희망일에 15일 뒤 날짜를 넣고 「다음」 을 누른다', async () => {
    await 주문서.이전누르기();
    await 주문서.받는분.waitFor();
    await 주문서.배송정보채우기({ ...입력, 희망일: 날짜뒤(15, 고정오늘) });
    await 주문서.다음누르기();
    await verify('배송 희망일에 15일 뒤 날짜를 넣으면 결제 수단 단계로 넘어가지 않는다', await 주문서.결제수단단계.isVisible(), false);
  });
});
