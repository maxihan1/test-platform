import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 결제수단단계로가기, 고정오늘, 날짜뒤, 장바구니로주문서열기, 정상배송입력 } from './helpers/shop.helper.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-098',
  name: '받는 분을 비우고 「다음」 을 누르면 「받는 분을 입력하세요」 가 보인다',
  platforms: ['desktop'],
  precondition: ['회원이 장바구니 상품으로 주문서를 열었다', '오늘이 2026-10-12 월요일이다'],
  techniques: ['동등 분할'],
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

  await test.step('받는 분만 비우고 「다음」 을 누른다', async () => {
    await 주문서.배송정보채우기({ ...입력, 받는분: '' });
    await 주문서.다음누르기();
    await verify('받는 분을 비우고 「다음」 을 누르면 「받는 분을 입력하세요」 가 보인다', await 주문서.오류문구('받는 분을 입력하세요').isVisible(), true);
  });

  await test.step('연락처만 비우고 「다음」 을 누른다', async () => {
    await 주문서.배송정보채우기({ ...입력, 연락처: '' });
    await 주문서.다음누르기();
    await verify('연락처를 비우고 「다음」 을 누르면 「연락처는 숫자 10~11자로 입력하세요」 가 보인다', await 주문서.오류문구('연락처는 숫자 10~11자로 입력하세요').isVisible(), true);
  });

  await test.step('연락처 칸에 「abc12」 를 적는다', async () => {
    await 주문서.연락처적기('abc12');
    await verify('연락처 칸에 「abc12」 를 적으면 「12」 만 남는다', await 주문서.연락처.inputValue(), '12');
  });

  await test.step('주소를 채우지 않고 「다음」 을 누른다', async () => {
    await 주문서.배송정보채우기({ ...입력, 우편번호: '', 주소: '' });
    await 주문서.다음누르기();
    await verify('주소를 비우고 「다음」 을 누르면 「주소 검색으로 주소를 입력하세요」 가 보인다', await 주문서.오류문구('주소 검색으로 주소를 입력하세요').isVisible(), true);
  });

  await test.step('상세 주소만 비우고 「다음」 을 누른다', async () => {
    await 주문서.배송정보채우기({ ...입력, 상세주소: '' });
    await 주문서.다음누르기();
    await verify('상세 주소를 비우고 「다음」 을 누르면 「상세 주소를 입력하세요」 가 보인다', await 주문서.오류문구('상세 주소를 입력하세요').isVisible(), true);
  });

  await test.step('배송 희망일에 15일 뒤 날짜를 넣고 「다음」 을 누른다', async () => {
    await 주문서.배송정보채우기({ ...입력, 희망일: 날짜뒤(15, 고정오늘) });
    await 주문서.다음누르기();
    await verify(
      '15일 뒤 날짜를 넣으면 「배송 희망일은 2일 뒤부터 14일 뒤까지 고를 수 있습니다」 가 보인다',
      await 주문서.오류문구('배송 희망일은 2일 뒤부터 14일 뒤까지 고를 수 있습니다').isVisible(),
      true,
    );
  });

  await test.step('결제 수단을 고르지 않고 「다음」 을 누른다', async () => {
    await 결제수단단계로가기(주문서, 입력);
    await 주문서.다음누르기();
    await verify('결제 수단을 고르지 않고 「다음」 을 누르면 「결제 수단을 선택하세요」 가 보인다', await 주문서.오류문구('결제 수단을 선택하세요').isVisible(), true);
  });
});
