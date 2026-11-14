import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { apiPost, 계정찾기API } from './helpers/api.helper.js';
import { 계정창열기 } from './helpers/account-api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import type { 새창 } from './helpers/page-setup.helper.js';
import { 알림머리말화면 } from './pages/notifications-header.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-487',
  name: '나를 팔로우한 계정이 있으면 알림에 「님이 나를 팔로우했습니다」 알림이 보인다',
  precondition: ['일반 회원을 팔로우한 계정이 있다', '일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
    adminId: z.string().describe('관리자 이메일').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 암호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});
test(spec, async ({ page, params }) => {
  const 알림 = new 알림머리말화면(page);
  let 관리창: 새창 | undefined;
  let 대상번호 = '';

  try {
    await test.step('관리자가 일반 회원을 팔로우한다', async () => {
      관리창 = await 계정창열기(page, params.adminId, params.adminPassword);
      대상번호 = (await 계정찾기API(관리창.page, 'qa_user1')).id;
      const 응답 = await apiPost(관리창.page, `/api/v1/accounts/${대상번호}/follow`);
      await verify('관리자의 팔로우 요청이 받아들여진다', 응답.ok(), true, { blocker: true });
    });

    await test.step('일반 회원으로 로그인한다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
    });

    await test.step('알림 화면을 연다', async () => {
      await 알림.열기();
      const 떴다 = await 알림.안내(/님이 나를 팔로우했습니다|날 팔로우했습니다/).first().waitFor({ timeout: 15_000 }).then(() => true, () => false);
      await verify('나를 팔로우한 계정이 있으면 알림에 「님이 나를 팔로우했습니다」 알림이 보인다', 떴다, true);
    });
  } finally {
    if (관리창 !== undefined) {
      if (대상번호 !== '') await apiPost(관리창.page, `/api/v1/accounts/${대상번호}/unfollow`);
      await 관리창.창묶음.close();
    }
  }
});
