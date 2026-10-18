import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 세션회원있는가 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 상품상세화면 } from './pages/product.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-252',
  name: '「N명이 보고 있어요」 숫자가 3~30 사이다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: z.object({
    productId: z.number().describe('열어 볼 상품 번호 — 품절이 아닌 상품').default(2),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 상품상세화면(page);
  const 숫자 = async (): Promise<number> => Number((await 상세.보고있어요.innerText()).replace(/\D/g, ''));

  await test.step('비회원인지 확인한다', async () => {
    await verify('비회원이라 세션에 회원이 없다', await 세션회원있는가(page.request), false, { blocker: true });
  });

  await test.step('상품 상세를 열고 「N명이 보고 있어요」 숫자를 확인한다', async () => {
    await 방해창막기(page);
    await page.clock.install();
    await 상세.열기(params.productId);
    await 상세.보고있어요.filter({ hasText: /\d/ }).waitFor();
    const 처음 = await 숫자();
    await verify('「N명이 보고 있어요」 숫자가 3~30 사이다', 처음 >= 3 && 처음 <= 30, true);
  });

  await test.step('5초를 보낸다', async () => {
    await 상세.보고있어요.evaluate((요소) => {
      const 창 = window as unknown as { __보임: string[] };
      창.__보임 = [요소.textContent ?? ''];
      new MutationObserver(() => 창.__보임.push(요소.textContent ?? '')).observe(요소, { childList: true, characterData: true, subtree: true });
    });
    await page.clock.fastForward(5000);
    const 다시정해진수 = await page.evaluate(() => (window as unknown as { __보임: string[] }).__보임.length - 1);
    const 지금 = await 숫자();
    await verify('5초가 지나면 「N명이 보고 있어요」 숫자가 새로 정해진다', [다시정해진수 >= 1, 지금 >= 3 && 지금 <= 30], [true, true]);
  });
});
