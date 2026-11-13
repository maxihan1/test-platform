import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 점검화면 } from './pages/maintenance.page.js';
import { 점검끄고앞상태받기, 점검원래대로 } from './helpers/maintenance-dash.helper.js';
import { 점검읽기 } from './helpers/ops-api.helper.js';
import type { 점검 as 점검상태 } from './helpers/ops-api.helper.js';
import { 로그인상태인가 } from './helpers/maintenance-dash.helper.js';
import { 점검바꾸기 } from './helpers/maintenance-dash.helper.js';

export const spec = defineCase({
  tcId: 'ARO-FN-622',
  name: '끝 시각이 지난 점검을 켜 둔 채 「점검」 화면을 열면 현재 상태 칩이 「점검 예약」이다',
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

    await test.step('API 로 끝 시각이 지난 점검을 켜 두고 「점검」 화면을 연다', async () => {
      const 응답 = await 점검바꾸기(page, { enabled: true, message: '[QA] ARO-FN-622 ' + String(Date.now()), startsAt: null, endsAt: new Date(Date.now() - 3_600_000).toISOString(), allowedAccountIds: '' });
      await verify('끝 시각이 지난 점검 켜기 요청이 성공한다', 응답.status < 300, true, { blocker: true });
      await 점검.열기();
      await verify('끝 시각이 지난 점검을 켜 둔 채 「점검」 화면을 열면 현재 상태 칩이 「점검 예약」이다', (await 점검.상태칩.innerText()).trim(), '점검 예약');
    });
  } finally {
    if (앞 !== undefined) await 점검원래대로(page, 앞);
  }
});
