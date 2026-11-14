import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 문구가보이나 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필편집화면 } from './pages/profile-edit.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-626',
  name: '소개 해시태그가 10개면 더 더할 수 없다',
  platforms: ['android'],
  techniques: ['경계값 분석'],
  held: '보류 — 소개 해시태그 수를 맞췄다 되돌릴 길',
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

  await test.step('프로필 편집에서 「Featured hashtags」 줄을 연다', async () => {
    await 프로필.내프로필열기();
    await 편집.열기();
    await 편집.줄누르기('Featured hashtags');
  });

  await test.step('소개 해시태그를 10개로 채운다', async () => {
    await verify('소개 해시태그가 10개면 더 더할 수 없다', !(await 문구가보이나(driver, 'Add hashtag', 3_000)), true);
  }, { capture: true });

  await test.step('소개 해시태그 11개째를 더한다', async () => {
    await verify('소개 해시태그 11개째는 더해지지 않는다', !(await 문구가보이나(driver, 'Add hashtag', 3_000)), true);
  }, { capture: true });
});
