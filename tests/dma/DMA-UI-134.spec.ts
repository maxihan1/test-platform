import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 맨위줄 } from './components/top-bar.component.js';
import { 상품상세열기 } from './helpers/cart.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 상품상세화면 } from './pages/product-detail.page.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'DMA-UI-134',
  name: '상품 상세 버튼 반응',
  platforms: ['android'],
  precondition: ['옵션 있는 상품 상세 화면이 떠 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    optionProduct: z
      .string()
      .describe('옵션 있는 상품 이름 — 색상 · 사이즈 칩이 있고 품절이 아닌 상품')
      .default('데모 니트 가디건'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 목록 = new 상품목록화면(driver);
  const 상세 = new 상품상세화면(driver);

  await test.step('일반 회원 계정으로 로그인해 상품 목록을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('상품 목록이 보인다', await 목록.보이나(), true, { blocker: true });
  });

  await test.step('상품 목록에서 옵션 있는 상품 상세를 연다', async () => {
    await 상품상세열기(driver, params.optionProduct);
    await verify('옵션 있는 상품 상세 화면이 보인다', await 상세.옵션있나(), true, { blocker: true });
  });

  await test.step('상품 상세에서 「←」를 누른다', async () => {
    await new 맨위줄(driver).뒤로();
    await 목록.열릴때까지().catch(() => undefined);
    await verify('상품 상세에서 「←」를 누르면 상품 목록으로 돌아간다', await 목록.보이나(), true);
    await 상품상세열기(driver, params.optionProduct);
  });

  await test.step('상품 상세에서 색상 칩을 누른다', async () => {
    await 상세.칩누르기('색상');
    await driver.waitUntil(async () => 상세.칩골라졌나('색상'), { timeout: 5000, interval: 200 }).catch(() => undefined);
    await verify('상품 상세에서 색상 칩을 누르면 그 칩이 골라진다', await 상세.칩골라졌나('색상'), true);
  });

  await test.step('상품 상세에서 사이즈 칩을 누른다', async () => {
    await 상세.칩누르기('사이즈');
    await driver.waitUntil(async () => 상세.칩골라졌나('사이즈'), { timeout: 5000, interval: 200 }).catch(() => undefined);
    await verify('상품 상세에서 사이즈 칩을 누르면 그 칩이 골라진다', await 상세.칩골라졌나('사이즈'), true);
  });
});
