import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 장바구니로주문서열기 } from './helpers/shop.helper.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-100',
  name: '연락처를 9자로 적고 「다음」 을 누르면 「연락처는 숫자 10~11자로 입력하세요」 가 보인다',
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

  await test.step('회원으로 로그인해 장바구니 상품으로 주문서를 연다', async () => {
    await 장바구니로주문서열기(page, params.loginId ?? '', params.password ?? '');
  });

  await test.step('주문서 배송 정보 단계를 확인한다', async () => {
    await verify('주문서 「① 배송 정보」 단계가 보인다', await 주문서.지금단계.innerText(), '① 배송 정보', { blocker: true });
  });

  await test.step('연락처 칸에 9자를 적고 「다음」 을 누른다', async () => {
    await 주문서.연락처적기('010123456');
    await 주문서.다음누르기();
    await verify('연락처를 9자로 적고 「다음」 을 누르면 「연락처는 숫자 10~11자로 입력하세요」 가 보인다', await 주문서.오류문구('연락처는 숫자 10~11자로 입력하세요').isVisible(), true);
  });

  await test.step('연락처 칸에 10자를 적고 「다음」 을 누른다', async () => {
    await 주문서.연락처적기('0101234567');
    await 주문서.다음누르기();
    await verify('연락처를 10자로 적으면 「연락처는 숫자 10~11자로 입력하세요」 가 보이지 않는다', await 주문서.오류문구('연락처는 숫자 10~11자로 입력하세요').isVisible(), false);
  });

  await test.step('연락처 칸에 11자를 적는다', async () => {
    await 주문서.연락처적기('01012345678');
    await verify('연락처 칸에 11자를 적으면 11자가 모두 들어간다', await 주문서.연락처.inputValue(), '01012345678');
  });

  await test.step('연락처 칸에 12자를 적는다', async () => {
    await 주문서.연락처적기('010123456789');
    await verify('연락처 칸에 12자를 적으면 11자까지만 들어간다', await 주문서.연락처.inputValue(), '01012345678');
  });
});
