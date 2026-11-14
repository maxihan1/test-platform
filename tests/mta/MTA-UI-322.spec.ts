import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 프로필열기 } from './helpers/app.helper.js';
import { 확인창이면누르기 } from './helpers/profile.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-322',
  name: '잠긴 계정 프로필 동작 버튼은 「Request to follow」이고 보낸 뒤 「Cancel request」로 바뀐다',
  platforms: ['android'],
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('팔로우 요청을 보낸 yuna_locked 프로필을 연다', async () => {
    try {
      await 프로필열기(driver, 'yuna_locked');
      if ((await 프로필.동작버튼글()) === 'Cancel request') {
        await 프로필.동작버튼누르기();
        await 확인창이면누르기(driver);
      }
      const 요청전 = await 프로필.동작버튼글이될때까지('Request to follow');
      await 프로필.동작버튼누르기();
      const 요청후 = await 프로필.동작버튼글이될때까지('Cancel request');
      const 판정1 = await verify('잠긴 계정 프로필 동작 버튼이 「Request to follow」다', 요청전, true);
      const 판정2 = await verify('팔로우 요청을 보낸 뒤 동작 버튼이 「Cancel request」로 바뀐다', 요청후, true);
      await verify('잠긴 계정 프로필 동작 버튼은 「Request to follow」이고 보낸 뒤 「Cancel request」로 바뀐다', 판정1 && 판정2, true);
    } finally {
      if ((await 프로필.동작버튼글()) === 'Request to follow') {
        await 프로필.동작버튼누르기();
      }
    }
  }, { capture: true });
});
