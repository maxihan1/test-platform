import { 계정창열기 } from './helpers/account-api.helper.js';
import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글경로, 글찾기API } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 글상세화면 } from './pages/status.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-966',
  name: '권한 없는 일반 회원이 팔로워만 글 주소를 열면 그 본문이 보이지 않는다',
  techniques: ['동등 분할'],
  precondition: ['두 번째 사용자가 볼 수 있는 yuna_locked 팔로워만 글 주소가 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
    secondId: z.string().describe('두 번째 사용자 이메일').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 암호').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 상세 = new 글상세화면(page);
  let 경로 = '';

  await test.step('두 번째 사용자가 볼 수 있는 yuna_locked 팔로워만 글 주소를 찾는다', async () => {
    const 창 = await 계정창열기(page, params.secondId, params.secondPassword);
    try {
      const 글 = await 글찾기API(창.page, 'yuna_locked', '팔로워에게만 쓰는 근황');
      경로 = 글경로(글);
      const 상세둘째 = new 글상세화면(창.page);
      await verify('두 번째 사용자는 그 글의 본문을 본다', await 상세둘째.열고본문기다리기(경로, '팔로워에게만 쓰는 근황'), true, { blocker: true });
    } finally {
      await 창.창묶음.close();
    }
  });

  await test.step('일반 회원으로 그 글 주소를 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await verify('권한 없는 일반 회원이 팔로워만 글 주소를 열면 그 본문이 보이지 않는다', await 상세.열고본문기다리기(경로, '팔로워에게만 쓰는 근황'), false);
  });
});
