import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고객센터 } from './pages/support-faq.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-059',
  name: '배율이 가장 클 때 「확대」 버튼은 눌리지 않는다',
  platforms: ['desktop'],
  unconfirmed: '기획서와 다름 — 차이 D8: 지도 배율의 한계(1~5)가 기획서에 없다 (작성 요청 5873)',
  precondition: ['비회원이다'],
  params: z.object({
    maxClicks: z.number().describe('최대로 누르는 횟수').default(10),
  }),
  expected: z.object({
    disabled: z.boolean().describe('「확대」 버튼이 눌리지 않는지').default(true),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 센터 = new 고객센터(page);

  await test.step('고객센터 화면을 연다', async () => {
    await page.context().addInitScript(() => localStorage.setItem('dm_cookie_ok', '1'));
    await 센터.열기();
    await 센터.배율.waitFor();
  });

  await test.step('지도 틀 안의 「확대」를 배율이 더 오르지 않을 때까지 누른다', async () => {
    for (let i = 0; i < params.maxClicks && (await 센터.확대.isEnabled()); i += 1) {
      await 센터.확대.click();
    }
    await verify('배율이 가장 클 때 「확대」 버튼은 눌리지 않는다', await 센터.확대.isDisabled(), expected.disabled);
  });
});
