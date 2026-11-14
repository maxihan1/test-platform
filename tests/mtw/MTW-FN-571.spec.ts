import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { apiPatch, 계정창열기 } from './helpers/account-api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import type { 새창 } from './helpers/page-setup.helper.js';
import { 팔로우목록화면 } from './pages/follow-list.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-571',
  name: '팔로워 · 팔로잉을 숨긴 계정의 팔로워 목록을 열면 「이 사용자는 이 정보를 사용할 수 없도록 설정했습니다」가 보인다',
  precondition: ['두 번째 사용자가 「팔로워와 팔로잉 보여주기」를 꺼 두었다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
    secondId: z.string().describe('두 번째 사용자 이메일').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 암호').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 목록 = new 팔로우목록화면(page);
  let 두번째창: 새창 | undefined;

  try {
    await test.step('두 번째 사용자가 「팔로워와 팔로잉 보여주기」를 꺼 둔다', async () => {
      두번째창 = await 계정창열기(page, params.secondId, params.secondPassword);
      const 응답 = await apiPatch(두번째창.page, '/api/v1/accounts/update_credentials', { hide_collections: true });
      await verify('두 번째 사용자가 「팔로워와 팔로잉 보여주기」를 껐다', 응답.ok(), true, { blocker: true });
    });

    await test.step('일반 회원으로 qa_user2 팔로워 목록을 연다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await 목록.팔로워열기('qa_user2');
      let 보인다 = await 목록.글('이 사용자는 이 정보를 사용할 수 없도록 설정했습니다').waitFor({ timeout: 8_000 }).then(() => true, () => false);
      if (!보인다) {
        await 목록.팔로워열기('qa_user2');
        보인다 = await 목록.글('이 사용자는 이 정보를 사용할 수 없도록 설정했습니다').waitFor({ timeout: 8_000 }).then(() => true, () => false);
      }
      await verify('팔로워 · 팔로잉을 숨긴 계정의 팔로워 목록을 열면 「이 사용자는 이 정보를 사용할 수 없도록 설정했습니다」가 보인다', 보인다, true);
    });
  } finally {
    if (두번째창 !== undefined) {
      await apiPatch(두번째창.page, '/api/v1/accounts/update_credentials', { hide_collections: false });
      await 두번째창.창묶음.close();
    }
  }
});
