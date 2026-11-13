import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 기록화면 } from './pages/logs.page.js';

export const spec = defineCase({
  tcId: 'ARO-UI-012',
  name: '「기록」 표의 「시각」 칸에 시각이 2026-11-10 14:03 꼴로 분까지 보인다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 기록화면(page);

  await test.step('운영자 계정으로 로그인하고 「기록」 화면을 연다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
    await 화면.열기();
    await verify('「기록」 표에 줄이 보인다', (await 화면.줄들.count()) > 0, true, { blocker: true });
  });

  await test.step('「기록」 표의 「시각」 칸을 본다', async () => {
    const 시각들 = await 화면.칸들('시각').allInnerTexts();
    const 꼴이다른것 = 시각들.map((글) => 글.trim()).filter((글) => !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(글));
    await verify('「기록」 표의 「시각」 칸에 시각이 2026-11-10 14:03 꼴로 분까지 보인다', 꼴이다른것.join(', '), '');
  });
});
