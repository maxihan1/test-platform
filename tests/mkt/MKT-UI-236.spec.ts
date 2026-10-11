import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-236',
  name: '주문서 위쪽에 「① 배송 정보」 · 「② 결제 수단」 · 「③ 최종 확인」 단계가 보인다',
  platforms: ['desktop'],
  precondition: ['회원이 장바구니 상품으로 주문서를 열었다'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 장바구니 = new 장바구니화면(page);
  const 주문서 = new 주문서화면(page);
  const 머리 = new 머리글(page);

  await test.step('회원으로 로그인한다', async () => {
    await 방해막기(page);
    await 화면로그인(page, params.loginId ?? '', params.password ?? '');
    await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
  });

  await test.step('장바구니 화면을 연다', async () => {
    await 장바구니.열기();
    await verify('장바구니에 상품이 담겨 있다', (await 장바구니.줄들.count()) > 0, true, { blocker: true });
  });

  await test.step('장바구니에서 「주문하기」 를 눌러 주문서를 연다', async () => {
    await 장바구니.주문하기누르기();
    await 주문서.받는분.waitFor();
    await verify('주문서 위쪽에 「① 배송 정보」 · 「② 결제 수단」 · 「③ 최종 확인」 단계가 보인다', await 주문서.단계이름들(), ['① 배송 정보', '② 결제 수단', '③ 최종 확인']);
    await verify('주문서 단계 표시에서 지금 단계 「① 배송 정보」 가 강조되어 보인다', await 주문서.지금단계.innerText(), '① 배송 정보');
    await verify(
      '배송 요청 사항 드롭다운에 「문 앞에 놓아 주세요」 · 「경비실에 맡겨 주세요」 · 「직접 입력」 이 있다',
      (await 주문서.요청사항.locator('option').allInnerTexts()).filter((글) => ['문 앞에 놓아 주세요', '경비실에 맡겨 주세요', '직접 입력'].includes(글)),
      ['문 앞에 놓아 주세요', '경비실에 맡겨 주세요', '직접 입력'],
    );
    await verify('주문서 주소 칸은 직접 적을 수 없게 보인다', await 주문서.주소.isEditable(), false);
    await verify('배송 희망일 칸은 날짜 선택 칸이다', await 주문서.희망일.getAttribute('type'), 'date');
  });
});
