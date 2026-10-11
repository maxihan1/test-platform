import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 결제수단단계로가기, 일요일배송일, 장바구니로주문서열기, 정상배송입력, 최종확인단계로가기 } from './helpers/shop.helper.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-095',
  name: '배송 정보를 비운 채 「다음」 을 누르면 결제 수단 단계로 넘어가지 않는다',
  platforms: ['desktop'],
  precondition: ['회원이 장바구니 상품으로 주문서를 열었다'],
  techniques: ['결정 테이블'],
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

  await test.step('배송 정보를 비운 채 「다음」 을 누른다', async () => {
    await 주문서.다음누르기();
    await verify('배송 정보를 비운 채 「다음」 을 누르면 결제 수단 단계로 넘어가지 않는다', await 주문서.결제수단단계.isVisible(), false);
  });

  await test.step('결제 수단을 고르지 않고 「다음」 을 누른다', async () => {
    await 결제수단단계로가기(주문서, 입력);
    await 주문서.다음누르기();
    await verify('결제 수단을 고르지 않고 「다음」 을 누르면 최종 확인 단계로 넘어가지 않는다', await 주문서.최종확인단계.isVisible(), false);
  });

  await test.step('배송 희망일로 일요일을 고르고 「다음」 을 누른다', async () => {
    await 주문서.이전누르기();
    await 주문서.받는분.waitFor();
    await 주문서.희망일.fill(일요일배송일());
    await 주문서.다음누르기();
    await verify(
      '배송 희망일로 일요일을 고르면 「일요일은 배송하지 않습니다」 가 보이고 다음으로 넘어가지 않는다',
      { 문구: await 주문서.오류문구('일요일은 배송하지 않습니다').isVisible(), 결제수단단계: await 주문서.결제수단단계.isVisible() },
      { 문구: true, 결제수단단계: false },
    );
  });

  await test.step('최종 확인 단계에서 동의 체크박스를 켜지 않는다', async () => {
    await 주문서.희망일.fill(입력.희망일);
    await 최종확인단계로가기(주문서, 입력);
    await verify('동의 체크박스가 꺼져 있다', await 주문서.동의.isChecked(), false, { blocker: true });
    await verify('「주문 내용을 확인했으며 결제에 동의합니다」 를 켜지 않으면 「결제하기」 가 눌리지 않는다', await 주문서.결제하기.isDisabled(), true);
  });
});
