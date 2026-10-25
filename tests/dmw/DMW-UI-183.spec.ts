import { defineCase, test, verify } from '@platform/kit';

import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 장바구니비우기 } from './helpers/data.helper.js';
import { 넉넉한상품, 상품담기 } from './helpers/shop-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 주문서화면 } from './pages/checkout.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-183',
  name: '배송 요청 사항에 「문 앞에 놓아 주세요」 · 「경비실에 맡겨 주세요」 · 「직접 입력」이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 주문서 = new 주문서화면(page);
  const 상품 = await 넉넉한상품(request, false);
  await 안내창막기(page);
  await 일회용회원으로로그인(page);
  const 줄 = await 상품담기(page.request, 상품, 1);

  try {
    await test.step('배송 요청 사항 선택 상자를 연다', async () => {
      await 주문서.열기([줄]);
      await verify('주문서 화면이 보인다', await 주문서.제목.isVisible(), true, { blocker: true });
      const 선택지 = await 주문서.선택지들(주문서.배송요청);
      const 문앞 = await verify('「문 앞에 놓아 주세요」가 보인다', 선택지.includes('문 앞에 놓아 주세요'), true);
      const 경비실 = await verify('「경비실에 맡겨 주세요」가 보인다', 선택지.includes('경비실에 맡겨 주세요'), true);
      const 직접 = await verify('「직접 입력」이 보인다', 선택지.includes('직접 입력'), true);
      await verify('배송 요청 사항에 「문 앞에 놓아 주세요」 · 「경비실에 맡겨 주세요」 · 「직접 입력」이 보인다', 문앞 && 경비실 && 직접, true);
    });
    await test.step('배송 요청 사항에서 「직접 입력」을 고른다', async () => {
      await 주문서.배송요청.selectOption({ label: '직접 입력' });
      await verify('배송 요청 사항에서 「직접 입력」을 고르면 입력칸이 새로 보인다', await 주문서.직접입력칸.isVisible(), true);
    });
  } finally {
    await 장바구니비우기(page.request);
  }
});
