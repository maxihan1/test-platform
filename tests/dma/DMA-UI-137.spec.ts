import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 맨위줄 } from './components/top-bar.component.js';
import { 기기오늘, 일요일아닌첫날 } from './helpers/app.helper.js';
import { 로그인하고주문하기열기 } from './helpers/checkout-flow.helper.js';
import { 주소검색창 } from './pages/address-search.page.js';
import { 주문하기화면 } from './pages/checkout.page.js';
import { 상품상세화면 } from './pages/product-detail.page.js';

export const spec = defineCase({
  tcId: 'DMA-UI-137',
  name: '주문하기 버튼 반응',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 있다', '주문하기 화면이 떠 있다', '주소 검색 창이 떠 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    상품이름: z.string().describe('주문할 상품 이름 — 옵션이 없고 품절이 아닌 상품').default('USB-C 허브'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 주문하기 = new 주문하기화면(driver);
  const 창 = new 주소검색창(driver);

  await test.step('일반 회원 계정으로 로그인해 주문하기 화면을 연다', async () => {
    await 로그인하고주문하기열기(driver, params.loginId, params.loginPassword, params.상품이름);
    await verify('주문하기 화면이 떠 있다', await 주문하기.보이나(), true, { blocker: true });
  });

  await test.step('주문하기에서 「주소 검색」을 누른다', async () => {
    await 주문하기.보일때까지밀기(await 주문하기.주소검색버튼.getElement(), false);
    await 주문하기.주소검색버튼.click();
    await 창.열릴때까지().catch(() => undefined);
    await verify('주문하기에서 「주소 검색」을 누르면 주소 검색 창이 뜬다', await 창.보이나(), true);
  });

  await test.step('주소 검색 창에서 「닫기」를 누른다', async () => {
    await 창.닫기버튼.click();
    await 창.닫힐때까지().catch(() => undefined);
    const 닫힘 = await verify('주소 검색 창이 닫힌다', !(await 창.보이나()), true);
    const 안넣음 = await verify('주소 줄은 「주소를 검색하세요」 그대로다', await 주문하기.주소줄글(), '주소를 검색하세요');
    await verify('주소 검색 창에서 「닫기」를 누르면 주소를 넣지 않고 창이 닫힌다', 닫힘 && 안넣음, true);
  });

  await test.step('주문하기에서 배송 희망일 칩을 누른다', async () => {
    const 칩 = await 주문하기.날짜칩찾기(일요일아닌첫날(await 기기오늘(driver)));
    await 칩.click();
    await driver
      .waitUntil(async () => 주문하기.날짜칩골라졌나(칩), { timeout: 5000, interval: 300 })
      .catch(() => undefined);
    await verify('주문하기에서 배송 희망일 칩을 누르면 그 칩이 골라진다', await 주문하기.날짜칩골라졌나(칩), true);
  });

  await test.step('주문하기에서 「←」를 누른다', async () => {
    const 상세 = new 상품상세화면(driver);
    await 주문하기.위로밀기();
    await new 맨위줄(driver).뒤로();
    await 상세.열릴때까지().catch(() => undefined);
    await verify('주문하기에서 「←」를 누르면 상품 상세로 돌아간다', await 상세.보이나(), true);
  }, { capture: true });
});
