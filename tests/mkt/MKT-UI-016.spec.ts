import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고객센터 } from './pages/support-faq.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-016',
  name: 'FAQ 화면에 분류 탭 「회원」 · 「주문/결제」 · 「배송」 · 「반품/교환」이 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({
    tabs: z.string().describe('분류 탭 이름').default('회원, 주문/결제, 배송, 반품/교환'),
  }),
});

test(spec, async ({ page, expected }) => {
  const 센터 = new 고객센터(page);

  await test.step('고객센터 FAQ 화면을 연다', async () => {
    await page.context().addInitScript(() => localStorage.setItem('dm_cookie_ok', '1'));
    await 센터.열기();
    await verify(
      'FAQ 화면에 분류 탭 「회원」 · 「주문/결제」 · 「배송」 · 「반품/교환」이 보인다',
      (await 센터.분류탭들.allInnerTexts()).join(', '),
      expected.tabs,
    );
  });
});
