import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글자수만큼 } from './helpers/profile.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필편집화면 } from './pages/profile-edit.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-413',
  name: '프로필 항목 라벨 칸에 255자를 적으면 255자가 다 들어간다',
  platforms: ['android'],
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    라벨글자수: z.number().describe('프로필 항목 라벨 칸에 적을 글자 수 — 255').default(255),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);
  const 편집 = new 프로필편집화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('프로필 편집에서 「Add field」 편집 창을 연다', async () => {
    await 프로필.내프로필열기();
    await 편집.열기();
    await 편집.줄누르기('Custom fields');
    await 편집.줄누르기('Add field');
    await 편집.칸뜰때까지();
  });

  await test.step('프로필 항목 라벨 칸에 255자를 적는다', async () => {
    try {
      await 편집.칸적기(글자수만큼(params.라벨글자수));
      await verify('프로필 항목 라벨 칸에 255자를 적으면 255자가 다 들어간다', await 편집.칸글자수(), 255);
    } finally {
      await 편집.나가기();
    }
  }, { capture: true });
});
