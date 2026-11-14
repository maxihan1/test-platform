import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 내계정API } from './helpers/api.helper.js';
import { 계정창열기, 관계API, 관계바꾸기API } from './helpers/account-api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import type { 새창 } from './helpers/page-setup.helper.js';

export const spec = defineCase({
  tcId: 'MTW-FN-667',
  name: '서로 팔로우하던 계정을 차단하면 양쪽 팔로우가 모두 끊긴다',
  precondition: ['관리자와 두 번째 사용자가 서로 팔로우해 두었다'],
  params: z.object({
    secondId: z.string().describe('두 번째 사용자 이메일').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 암호').optional().meta({ secret: true, account: '두 번째 사용자' }),
    adminId: z.string().describe('관리자 이메일').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 암호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  let 관리자창: 새창 | undefined;
  let 두번째id = '';
  let 관리자id = '';

  try {
    await test.step('관리자와 두 번째 사용자가 서로 팔로우하게 만든다', async () => {
      await 로그인하기(page, params.secondId, params.secondPassword);
      두번째id = (await 내계정API(page)).id;
      관리자창 = await 계정창열기(page, params.adminId, params.adminPassword);
      관리자id = (await 내계정API(관리자창.page)).id;
      await 관계바꾸기API(page, 관리자id, 'follow');
      await 관계바꾸기API(관리자창.page, 두번째id, 'follow');
      const 두번째쪽 = await verify('두 번째 사용자가 관리자를 팔로우한다', (await 관계API(page, 관리자id)).following, true, { blocker: true });
      const 관리자쪽 = await verify('관리자가 두 번째 사용자를 팔로우한다', (await 관계API(관리자창.page, 두번째id)).following, true, { blocker: true });
      await verify('서로 팔로우하고 있다', 두번째쪽 && 관리자쪽, true, { blocker: true });
    });

    await test.step('두 번째 사용자가 관리자를 차단한다', async () => {
      if (관리자창 === undefined) throw new Error('관리자 창이 없다');
      await 관계바꾸기API(page, 관리자id, 'block');
      const 두번째쪽 = await verify('두 번째 사용자가 관리자를 팔로우하지 않는다', (await 관계API(page, 관리자id)).following, false);
      const 관리자쪽 = await verify('관리자가 두 번째 사용자를 팔로우하지 않는다', (await 관계API(관리자창.page, 두번째id)).following, false);
      await verify('서로 팔로우하던 계정을 차단하면 양쪽 팔로우가 모두 끊긴다', 두번째쪽 && 관리자쪽, true);
    });
  } finally {
    if (관리자id !== '') {
      await 관계바꾸기API(page, 관리자id, 'unblock');
      await 관계바꾸기API(page, 관리자id, 'unfollow');
    }
    if (관리자창 !== undefined) {
      if (두번째id !== '') await 관계바꾸기API(관리자창.page, 두번째id, 'unfollow');
      await 관리자창.창묶음.close();
    }
  }
});
