import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 점검화면 } from './pages/maintenance.page.js';
import { 점검끄고앞상태받기, 점검원래대로 } from './helpers/maintenance-dash.helper.js';
import { 점검읽기 } from './helpers/ops-api.helper.js';
import type { 점검 as 점검상태 } from './helpers/ops-api.helper.js';
import { 로그인상태인가 } from './helpers/maintenance-dash.helper.js';
import { 점검바꾸기, 시각지날때까지 } from './helpers/maintenance-dash.helper.js';

export const spec = defineCase({
  tcId: 'ARO-FN-616',
  name: '시작을 몇 초 뒤로 정해 켠 점검은 시작 시각이 지나면 현재 상태 칩이 「점검 중」이다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 점검 = new 점검화면(page);
  let 앞: 점검상태 | undefined;

  try {
    await test.step('운영자 계정으로 로그인하고 점검을 꺼 둔다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      앞 = await 점검끄고앞상태받기(page);
      await verify('운영자 세션이 열려 있다', await 로그인상태인가(page), true, { blocker: true });
      await verify('점검이 꺼져 있다', (await 점검읽기(page)).enabled, false, { blocker: true });
    });

    await test.step('API 로 시작을 몇 초 뒤로 정해 점검을 켜고 시작 시각이 지난 뒤 「점검」 화면을 연다', async () => {
      const 시작 = Date.now() + 3_000;
      const 응답 = await 점검바꾸기(page, { enabled: true, message: '[QA] ARO-FN-616 ' + String(Date.now()), startsAt: new Date(시작).toISOString(), endsAt: null, allowedAccountIds: '' });
      await verify('점검 켜기 요청이 성공한다', 응답.status < 300, true, { blocker: true });
      await 시각지날때까지(page, 시작 + 1_000);
      await 점검.열기();
      await verify('시작을 몇 초 뒤로 정해 켠 점검은 시작 시각이 지나면 현재 상태 칩이 「점검 중」이다', (await 점검.상태칩.innerText()).trim(), '점검 중');
    });
  } finally {
    if (앞 !== undefined) await 점검원래대로(page, 앞);
  }
});
