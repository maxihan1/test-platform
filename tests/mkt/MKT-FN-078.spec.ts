import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 토스트 } from './components/toast.component.js';
import { 둘째아이디, 방해막기, 화면로그인 } from './helpers/account.helper.js';
import { 장바구니비우기, 장바구니읽기 } from './helpers/cart.helper.js';
import { 옵션없는상품번호 } from './helpers/shop.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-078',
  name: '「장바구니 담기」 를 빠르게 두 번 눌러도 장바구니 줄은 하나다',
  platforms: ['desktop'],
  precondition: ['장바구니가 빈 두 번째 회원으로 로그인해 있다'],
  techniques: ['오류 추정'],
  params: z.object({
    password: z.string().describe('비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 상품상세화면(page);
  const 머리 = new 머리글(page);
  const 알림 = new 토스트(page);

  try {
    await test.step('두 번째 회원으로 로그인하고 장바구니를 비운다', async () => {
      await 방해막기(page);
      await 화면로그인(page, 둘째아이디, params.password ?? '');
      await 장바구니비우기(page.request);
    });

    await test.step('장바구니가 비었는지 확인한다', async () => {
      await verify('머리글에 「로그아웃」 버튼이 보인다', await 머리.로그아웃버튼.isVisible(), true, { blocker: true });
      await verify('장바구니가 비어 있다', (await 장바구니읽기(page.request)).length, 0, { blocker: true });
    });

    await test.step('옵션 없는 상품 상세에서 「장바구니 담기」 를 빠르게 두 번 누른다', async () => {
      await 상세.열기(옵션없는상품번호);
      await 상세.담기두번누르기();
      await 알림.글('장바구니에 담았습니다').first().waitFor();
      await page.waitForTimeout(1000);
      await verify('「장바구니 담기」 를 빠르게 두 번 눌러도 장바구니 줄은 하나다', (await 장바구니읽기(page.request)).length, 1);
    });
  } finally {
    await 장바구니비우기(page.request);
  }
});
