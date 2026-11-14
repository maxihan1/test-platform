import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { opsGet } from './helpers/ops-api.helper.js';
import { 기록화면 } from './pages/logs.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-691',
  name: '유저를 검색하면 「기록」에 그 검색어가 든 줄이 생기지 않는다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 기록화면(page);
  const 낱말 = `zz검색${String(Date.now())}`;

  await test.step('운영자 계정으로 로그인한다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
  });

  await test.step('유저 검색 API 에 처음 쓰는 낱말로 찾은 뒤 「기록」에서 그 낱말로 찾는다', async () => {
    const 응답 = await opsGet(page, `/users?q=${encodeURIComponent(낱말)}&page=1&size=10`);
    await verify('유저 검색 요청이 받아들여진다', 응답.status, 200, { blocker: true });
    await 화면.열기();
    await verify('「기록」 표에 줄이 보인다', (await 화면.줄들.count()) > 0, true, { blocker: true });
    await 화면.검색(낱말);
    await verify('유저를 검색하면 「기록」에 그 검색어가 든 줄이 생기지 않는다', await 화면.줄들.count(), 0);
  });
});
