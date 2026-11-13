import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 로그인상태인가, 점검끄고앞상태받기, 점검원래대로, 점검바꾸기 } from './helpers/maintenance-dash.helper.js';
import { 대시보드화면 } from './pages/dashboard.page.js';
import type { 점검 } from './helpers/ops-api.helper.js';

export const spec = defineCase({
  tcId: 'ARO-FN-154',
  name: '점검을 켠 뒤 대시보드를 열면 「점검」 카드에 「점검 중」과 「로그인 막힘」 배지가 보인다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 대시보드 = new 대시보드화면(page);
  let 앞: 점검 | undefined;

  try {
    await test.step('운영자 계정으로 로그인하고 점검 상태를 받아 둔다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      앞 = await 점검끄고앞상태받기(page);
      await verify('운영자 세션이 열려 있다', await 로그인상태인가(page), true, { blocker: true });
    });

    await test.step('API 로 점검을 켠 뒤 대시보드를 연다', async () => {
      const 응답 = await 점검바꾸기(page, { enabled: true, message: '[QA] ARO-FN-154 ' + String(Date.now()), startsAt: null, endsAt: null, allowedAccountIds: '' });
      await verify('점검 켜기 요청이 성공한다', 응답.status < 300, true, { blocker: true });
      await 대시보드.열기();
      const 값 = await verify('「점검」 카드에 「점검 중」이 보인다', (await 대시보드.카드값('점검').innerText()).trim(), '점검 중');
      const 칩 = await verify('「점검」 카드에 「로그인 막힘」 배지가 보인다', (await 대시보드.카드칩('점검').innerText()).trim(), '로그인 막힘');
      await verify('점검을 켠 뒤 대시보드를 열면 「점검」 카드에 「점검 중」과 「로그인 막힘」 배지가 보인다', 값 && 칩, true);
    });
  } finally {
    if (앞 !== undefined) await 점검원래대로(page, 앞);
  }
});
