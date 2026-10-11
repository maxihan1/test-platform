import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 모달 } from './components/modal.component.js';
import { 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 장바구니되돌리기, 장바구니읽기 } from './helpers/cart.helper.js';
import { 보일때까지기다림, 사라질때까지기다림 } from './helpers/shop.helper.js';
import { 장바구니화면 } from './pages/cart.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-089',
  name: '「전체 선택」 을 끄면 모든 줄 체크가 꺼진다',
  platforms: ['desktop'],
  precondition: ['회원 장바구니에 상품 두 줄이 담겨 있다'],
  params: z.object({
    loginId: z.string().describe('아이디').optional().meta({ secret: true }),
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 장바구니 = new 장바구니화면(page);
  const 머리 = new 머리글(page);
  const 창 = new 모달(page);
  let 처음: Awaited<ReturnType<typeof 장바구니읽기>> = [];

  try {
    await test.step('회원으로 로그인한다', async () => {
      await 방해막기(page);
      await 화면로그인(page, params.loginId ?? '', params.password ?? '');
      처음 = await 장바구니읽기(page.request);
      await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
    });

    await test.step('장바구니 화면을 연다', async () => {
      await 장바구니.열기();
      await verify('장바구니에 상품 두 줄이 보인다', await 장바구니.줄들.count(), 2, { blocker: true });
    });

    const [첫줄, 둘째줄] = 처음;
    const 줄수 = 처음.length;

    await test.step('「전체 선택」 을 끈다', async () => {
      await 장바구니.전체선택.uncheck();
      const 체크 = await 장바구니.체크상태들();
      await verify('「전체 선택」 을 끄면 모든 줄 체크가 꺼진다', { 줄: 체크.length, 켜짐: 체크.filter(Boolean).length }, { 줄: 줄수, 켜짐: 0 });
    });

    await test.step('「전체 선택」 을 다시 켠다', async () => {
      await 장바구니.전체선택.check();
      const 체크 = await 장바구니.체크상태들();
      await verify('「전체 선택」 을 다시 켜면 모든 줄 체크가 켜진다', { 줄: 체크.length, 켜짐: 체크.filter(Boolean).length }, { 줄: 줄수, 켜짐: 줄수 });
    });

    await test.step('줄 하나의 체크를 끈다', async () => {
      await 장바구니.줄체크(첫줄.name).uncheck();
      await verify('줄 하나를 끄면 「전체 선택」 도 꺼진다', await 장바구니.전체선택.isChecked(), false);
    });

    await test.step('한 줄의 수량 「+」 를 누른다', async () => {
      const 전체합 = await 장바구니.금액읽기(장바구니.상품금액);
      const 새줄금액 = 둘째줄.unitPrice * (둘째줄.qty + 1);
      await 장바구니.줄수량늘리기(둘째줄.name).click();
      await 보일때까지기다림(장바구니.줄금액(둘째줄.name).filter({ hasText: 새줄금액.toLocaleString('ko-KR') }));
      await verify(
        '줄 수량을 바꾸면 줄 금액과 합계가 바로 바뀐다',
        { 줄금액: await 장바구니.금액읽기(장바구니.줄금액(둘째줄.name)), 합계: await 장바구니.금액읽기(장바구니.상품금액) },
        { 줄금액: 새줄금액, 합계: 전체합 + 둘째줄.unitPrice },
      );
    });

    await test.step('줄 하나만 켜고 「선택 삭제」 를 누른다', async () => {
      await 장바구니.줄체크(첫줄.name).uncheck();
      await 장바구니.줄체크(둘째줄.name).check();
      await 장바구니.선택삭제.click();
      await verify(
        '줄 하나를 고르고 「선택 삭제」 를 누르면 확인 창 「선택한 상품 1개를 삭제하시겠습니까?」 가 뜬다',
        await 창.본문.innerText(),
        '선택한 상품 1개를 삭제하시겠습니까?',
      );
    });

    await test.step('확인 창에서 「확인」 을 누른다', async () => {
      await 창.버튼('확인').click();
      await 사라질때까지기다림(장바구니.줄(둘째줄.name));
      await verify('확인 창에서 「확인」 을 누르면 체크한 줄이 장바구니에서 지워진다', await 장바구니.줄이름들(), [첫줄.name]);
    });
  } finally {
    await 장바구니되돌리기(page.request, 처음);
  }
});
