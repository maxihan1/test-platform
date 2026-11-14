import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 문구가보이나, 프로필열기 } from './helpers/app.helper.js';
import { 확인창이면누르기 } from './helpers/profile.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-622',
  name: '차단 · 뮤트한 상태에서 동작 버튼을 누르면 해제가 먼저 진행된다',
  platforms: ['android'],
  held: '보류 — 바꿔도 되는 뮤트 관계',
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

  await test.step('뮤트한 noisy_cho 프로필에서 동작 버튼을 누른다', async () => {
    try {
      await 프로필열기(driver, 'noisy_cho');
      await 프로필.동작버튼누르기();
      await 확인창이면누르기(driver);
      await verify('차단 · 뮤트한 상태에서 동작 버튼을 누르면 해제가 먼저 진행된다', !(await 문구가보이나(driver, 'Muted', 5_000)), true);
    } finally {
      await 프로필.메뉴고르기('Mute account');
      await 확인창이면누르기(driver);
    }
  }, { capture: true });
});
