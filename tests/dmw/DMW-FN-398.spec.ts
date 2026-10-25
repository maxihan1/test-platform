import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공지팝업읽기, 로그인한역할, 역할로그인 } from './helpers/my-admin-tools.helper.js';

export const spec = defineCase({
  tcId: 'DMW-FN-398',
  name: '관리자가 설정 변경 API 를 부르면 200 으로 응답한다',
  platforms: ['desktop', 'mobile'],
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  await test.step('관리자 계정으로 로그인한다', async () => {
    await 역할로그인(page.request, params.adminId, params.adminPassword);
  });

  await test.step('로그인 상태를 확인한다', async () => {
    await verify('관리자 계정으로 로그인해 있다', await 로그인한역할(page.request), 'admin', { blocker: true });
  });

  await test.step('관리자로 지금 값 그대로 PUT /api/admin/settings 를 부른다', async () => {
    const 지금 = await 공지팝업읽기(page.request);
    const 응답 = await page.request.put('/api/admin/settings', { data: { noticePopup: 지금 } });
    await verify('관리자가 설정 변경 API 를 부르면 200 으로 응답한다', 응답.status(), 200);
  });
});
