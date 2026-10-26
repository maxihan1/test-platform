import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공지팝업읽기 } from './helpers/my-admin-tools.helper.js';
import { 로그인한아이디 } from './helpers/my-admin-tools.helper.js';
import { 계정으로로그인 } from './helpers/login.helper.js';

export const spec = defineCase({
  tcId: 'DMW-FN-399',
  name: '일반 회원이 설정 변경 API 를 부르면 403 으로 응답한다',
  platforms: ['desktop', 'mobile'],
  techniques: ['동등 분할'],
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  await test.step('회원으로 로그인한다', async () => {
    await 계정으로로그인(page, params.loginId, params.loginPassword);
  });

  await test.step('로그인 상태를 확인한다', async () => {
    await verify('회원으로 로그인해 있다', (await 로그인한아이디(page.request)) !== null, true, { blocker: true });
  });

  await test.step('일반 회원으로 PUT /api/admin/settings 를 부른다', async () => {
    const 지금 = await 공지팝업읽기(page.request);
    const 응답 = await page.request.put('/api/admin/settings', { data: { noticePopup: 지금 } });
    await verify('일반 회원이 설정 변경 API 를 부르면 403 으로 응답한다', 응답.status(), 403);
  });
});
