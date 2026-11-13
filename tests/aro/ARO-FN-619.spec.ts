import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 로그인상태인가, 점검끄고앞상태받기, 점검원래대로, 점검바꾸기, 시각지날때까지 } from './helpers/maintenance-dash.helper.js';
import { 점검읽기, 서버상태 } from './helpers/ops-api.helper.js';
import type { 점검 as 점검상태 } from './helpers/ops-api.helper.js';

export const spec = defineCase({
  tcId: 'ARO-FN-619',
  name: '끝을 몇 초 뒤로 정해 켠 점검은 끝 시각이 지나면 /api/serverstatus 의 maintenance.active 가 false 다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
    API서버: z.string().url().describe('게임 API 서버 주소 — 운영툴과 같은 서버를 쓰는 API 서버').default('https://bossroom-api.maxihan.com'),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  let 앞: 점검상태 | undefined;

  try {
    await test.step('운영자 계정으로 로그인하고 점검을 꺼 둔다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      앞 = await 점검끄고앞상태받기(page);
      await verify('운영자 세션이 열려 있다', await 로그인상태인가(page), true, { blocker: true });
      await verify('점검이 꺼져 있다', (await 점검읽기(page)).enabled, false, { blocker: true });
    });

    await test.step('API 로 끝을 몇 초 뒤로 정해 점검을 켜고 끝 시각이 지난 뒤 /api/serverstatus 를 읽는다', async () => {
      const 끝 = Date.now() + 3_000;
      const 응답 = await 점검바꾸기(page, { enabled: true, message: '[QA] ARO-FN-619 ' + String(Date.now()), startsAt: null, endsAt: new Date(끝).toISOString(), allowedAccountIds: '' });
      await verify('점검 켜기 요청이 성공한다', 응답.status < 300, true, { blocker: true });
      await 시각지날때까지(page, 끝 + 2_000);
      const 상태 = await 서버상태(request, params.API서버);
      await verify('끝을 몇 초 뒤로 정해 켠 점검은 끝 시각이 지나면 /api/serverstatus 의 maintenance.active 가 false 다', 상태.maintenance.active, false);
    });
  } finally {
    if (앞 !== undefined) await 점검원래대로(page, 앞);
  }
});
