import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 공지화면 } from './pages/notices.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-765',
  name: '공지가 201건이면 표에 200건까지 보인다',
  techniques: ['경계값 분석'],
  held: '보류 — 공지 201건이 없다',
  precondition: ['공지가 201건 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    보이는건수: z.number().describe('공지 표에 보이는 줄 수').default(200),
  }),
});

test(spec, async ({ page, params, expected }) => {
  const 화면 = new 공지화면(page);

  await test.step('운영자 계정으로 로그인한다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
  });

  await test.step('「공지」 화면을 연다', async () => {
    await 화면.열기();
    await verify('공지 표가 보인다', await 화면.표.isVisible(), true, { blocker: true });
    await verify('공지가 201건이면 표에 200건까지 보인다', await 화면.줄들.count(), expected.보이는건수);
  });
});
