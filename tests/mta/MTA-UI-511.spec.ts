import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 프로필열기 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-511',
  name: '새 계정의 프로필 「미디어」 · 「추천」 탭 기본 노출(show_media · show_featured)은 확인 필요다',
  platforms: ['android'],
  held: '보류 — 새로 만든 활성 계정',
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    새계정사용자명: z.string().describe('새로 만든 활성 계정의 사용자명'),
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

  await test.step('새 계정 프로필을 연다', async () => {
    await 프로필열기(driver, params.새계정사용자명);
    const 판정1 = await verify('프로필 탭 「미디어」가 보인다', await 프로필.탭있나('미디어'), true);
    const 판정2 = await verify('프로필 탭 「추천」이 보인다', await 프로필.탭있나('추천'), true);
    await verify('새 계정의 프로필 「미디어」 · 「추천」 탭 기본 노출(show_media · show_featured)은 확인 필요다', 판정1 && 판정2, true);
  }, { capture: true });
});
