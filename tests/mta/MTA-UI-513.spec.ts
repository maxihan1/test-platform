import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 문구가보이나 } from './helpers/app.helper.js';
import { 확인창이면취소하기 } from './helpers/profile.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필편집화면 } from './pages/profile-edit.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-513',
  name: '프로필 항목 삭제는 「Delete field?」를 묻는다',
  platforms: ['android'],
  held: '보류 — 지워도 되는 프로필 항목',
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
  const 편집 = new 프로필편집화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('프로필 편집에서 「Custom fields」 줄을 연다', async () => {
    await 프로필.내프로필열기();
    await 편집.열기();
    await 편집.줄누르기('Custom fields');
  });

  await test.step('프로필 항목 삭제를 누른다', async () => {
    try {
      await 편집.삭제버튼누르기();
      await verify('프로필 항목 삭제는 「Delete field?」를 묻는다', await 문구가보이나(driver, 'Delete field?'), true);
    } finally {
      await 확인창이면취소하기(driver);
    }
  }, { capture: true });
});
