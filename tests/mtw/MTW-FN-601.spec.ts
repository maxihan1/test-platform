import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 내계정API } from './helpers/api.helper.js';
import { apiPatch, 계정창열기, 관계바꾸기API } from './helpers/account-api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import type { 새창 } from './helpers/page-setup.helper.js';
import { 팔로우목록화면 } from './pages/follow-list.page.js';
import { 팔로우요청화면 } from './pages/follow-requests.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-601',
  name: '팔로우 요청의 「승인」을 누르면 요청한 계정이 팔로워 목록에 보인다',
  precondition: ['두 번째 사용자 계정을 잠그고 관리자가 팔로우 요청을 보냈다'],
  params: z.object({
    secondId: z.string().describe('두 번째 사용자 이메일').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 암호').optional().meta({ secret: true, account: '두 번째 사용자' }),
    adminId: z.string().describe('관리자 이메일').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 암호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 요청목록 = new 팔로우요청화면(page);
  const 목록 = new 팔로우목록화면(page);
  let 두번째 = { id: '', acct: '' };
  let 관리자창: 새창 | undefined;
  let 관리자 = { id: '', acct: '' };

  try {
    await test.step('두 번째 사용자 계정을 잠그고 관리자가 팔로우 요청을 보낸다', async () => {
      await 로그인하기(page, params.secondId, params.secondPassword);
      두번째 = await 내계정API(page);
      await apiPatch(page, '/api/v1/accounts/update_credentials', { locked: true });
      관리자창 = await 계정창열기(page, params.adminId, params.adminPassword);
      관리자 = await 내계정API(관리자창.page);
      await 관계바꾸기API(관리자창.page, 두번째.id, 'unfollow');
      const 관계 = await 관계바꾸기API(관리자창.page, 두번째.id, 'follow');
      await verify('관리자가 잠긴 두 번째 사용자에게 팔로우 요청을 보냈다', 관계.requested, true, { blocker: true });
    });

    await test.step('두 번째 사용자로 팔로우 요청 목록에서 「승인」을 누른다', async () => {
      await 요청목록.열기();
      await 요청목록.승인하기(관리자.acct);
      await 목록.팔로워열기(두번째.acct);
      const 보인다 = await 목록.계정(관리자.acct).waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('팔로우 요청의 「승인」을 누르면 요청한 계정이 팔로워 목록에 보인다', 보인다, true);
    });

    await test.step('관리자가 다시 보낸 요청을 「거부」한다', async () => {
      if (관리자창 === undefined) throw new Error('관리자 창이 없다');
      await 관계바꾸기API(page, 관리자.id, 'remove_from_followers');
      await 관계바꾸기API(관리자창.page, 두번째.id, 'unfollow');
      const 관계 = await 관계바꾸기API(관리자창.page, 두번째.id, 'follow');
      await verify('관리자가 다시 팔로우 요청을 보냈다', 관계.requested, true, { blocker: true });
      await 요청목록.열기();
      await 요청목록.거부하기(관리자.acct);
      await 요청목록.열기();
      await 요청목록.목록그려질때까지();
      await verify('「거부」를 누른 요청은 목록에서 지워진다', await 요청목록.요청(관리자.acct).count(), 0);
    });
  } finally {
    if (두번째.id !== '') {
      if (관리자.id !== '') await 관계바꾸기API(page, 관리자.id, 'remove_from_followers');
      if (관리자창 !== undefined) {
        await 관계바꾸기API(관리자창.page, 두번째.id, 'unfollow');
        await 관리자창.창묶음.close();
      }
      await apiPatch(page, '/api/v1/accounts/update_credentials', { locked: false });
    }
  }
});
