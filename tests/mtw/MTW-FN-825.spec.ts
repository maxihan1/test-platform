import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정창열기, 팔로워전용글조각 } from './helpers/account-api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-825',
  name: '승인 전인 일반 회원이 잠긴 계정 프로필을 열면 팔로워 전용 글이 보이지 않는다',
  techniques: ['상태 전이'],
  precondition: ['일반 회원이 yuna_locked 에 팔로우 요청만 보낸 상태다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
    secondId: z.string().describe('두 번째 사용자 이메일').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 암호').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 프로필 = new 프로필화면(page);
  let 조각 = '';

  await test.step('두 번째 사용자 창으로 yuna_locked 의 팔로워 전용 글을 API 로 찾는다', async () => {
    const 창 = await 계정창열기(page, params.secondId, params.secondPassword);
    try {
      조각 = await 팔로워전용글조각(창.page, 'yuna_locked');
    } finally {
      await 창.창묶음.close();
    }
    await verify('yuna_locked 의 팔로워 전용 글을 찾았다', 조각 !== '', true, { blocker: true });
  });

  await test.step('일반 회원으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 프로필.메뉴.그려질때까지();
    await verify('왼쪽 메뉴에 「홈」 링크가 보인다', await 프로필.메뉴.링크('홈').isVisible(), true, { blocker: true });
  });

  await test.step('일반 회원으로 yuna_locked 프로필을 연다', async () => {
    await 프로필.열기('yuna_locked');
    await 프로필.첫글그려질때까지();
    await verify('프로필에 공개 글이 보인다', (await 프로필.글('').count()) > 0, true, { blocker: true });
    await verify('승인 전인 일반 회원이 잠긴 계정 프로필을 열면 팔로워 전용 글이 보이지 않는다', await 프로필.글(조각).count(), 0);
  });
});
