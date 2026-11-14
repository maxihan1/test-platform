import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 로그인상태인가, 숫자글 } from './helpers/maintenance-dash.helper.js';
import { 계정목록 } from './helpers/ops-api.helper.js';
import { 대시보드화면 } from './pages/dashboard.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-139',
  name: '대시보드를 열면 「게임 계정」 카드에 계정 API 의 전체 수가 보인다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 대시보드 = new 대시보드화면(page);

  await test.step('운영자 계정으로 로그인한다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
    await verify('운영자 세션이 열려 있다', await 로그인상태인가(page), true, { blocker: true });
  });

  await test.step('계정 API 의 전체 수를 읽고 대시보드를 연다', async () => {
    const 목록 = await 계정목록(page);
    await 대시보드.열기();
    await verify('대시보드를 열면 「게임 계정」 카드에 계정 API 의 전체 수가 보인다', (await 대시보드.카드값('게임 계정').innerText()).trim(), 숫자글(목록.total));
  });
});
