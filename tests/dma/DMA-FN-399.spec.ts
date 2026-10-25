import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 상품목록화면 } from './pages/product-list.page.js';

export const spec = defineCase({
  tcId: 'DMA-FN-399',
  name: '앞 분류의 응답이 늦게 와도 목록에는 「도서」 상품만 보인다',
  platforms: ['android'],
  held: '보류 — 앱이 받는 응답을 늦추는 방법이 자료에 없다',
  precondition: ['일반 회원 계정으로 로그인해 상품 목록이 떠 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    bookNames: z.string().describe('「도서」 상품 이름(목록 차례대로 쉼표로)'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 목록 = new 상품목록화면(driver);

  await test.step('일반 회원 계정으로 로그인해 상품 목록을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('상품 목록이 보인다', await 목록.보이나(), true, { blocker: true });
  });

  await test.step('「패션」 칩을 누르고 곧바로 「도서」 칩을 누른다', async () => {
    await 목록.분류누르기('패션');
    await 목록.분류누르기('도서');
    await driver.waitUntil(async () => 목록.분류칩골라졌나('도서'), { timeout: 15000, interval: 300 });
    await 목록.열릴때까지();
    const 기대 = params.bookNames.split(',').map((글) => 글.trim());
    const 이름들 = await 목록.끝까지모은상품이름들();
    await verify('앞 분류의 응답이 늦게 와도 목록에는 「도서」 상품만 보인다', 이름들.join(', '), 기대.join(', '));
  });
});
