import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 장바구니로주문서열기, 정상배송입력 } from './helpers/shop.helper.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-099',
  name: '연락처를 9자로 적으면 「다음」 을 눌러도 넘어가지 않는다',
  platforms: ['desktop'],
  precondition: ['회원이 장바구니 상품으로 주문서를 열었다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 주문서 = new 주문서화면(page);
  const 입력 = 정상배송입력();

  await test.step('회원으로 로그인해 장바구니 상품으로 주문서를 연다', async () => {
    await 장바구니로주문서열기(page, params.loginId ?? '', params.password ?? '');
  });

  await test.step('주문서 배송 정보 단계를 확인한다', async () => {
    await verify('주문서 「① 배송 정보」 단계가 보인다', await 주문서.지금단계.innerText(), '① 배송 정보', { blocker: true });
  });

  await test.step('연락처를 9자로 적고 나머지를 채워 「다음」 을 누른다', async () => {
    await 주문서.배송정보채우기({ ...입력, 연락처: '010123456' });
    await 주문서.다음누르기();
    await verify('연락처를 9자로 적으면 「다음」 을 눌러도 넘어가지 않는다', await 주문서.결제수단단계.isVisible(), false);
  });

  await test.step('연락처를 10자로 적고 나머지를 채워 「다음」 을 누른다', async () => {
    await 주문서.배송정보채우기({ ...입력, 연락처: '0101234567' });
    await 주문서.다음누르기();
    await 주문서.결제수단단계.waitFor();
    await verify('연락처를 10자로 적으면 결제 수단 단계로 넘어간다', await 주문서.결제수단단계.isVisible(), true);
  });

  await test.step('연락처를 11자로 적고 나머지를 채워 「다음」 을 누른다', async () => {
    await 주문서.이전누르기();
    await 주문서.받는분.waitFor();
    await 주문서.배송정보채우기({ ...입력, 연락처: '01012345678' });
    await 주문서.다음누르기();
    await 주문서.결제수단단계.waitFor();
    await verify('연락처를 11자로 적으면 결제 수단 단계로 넘어간다', await 주문서.결제수단단계.isVisible(), true);
  });
});
