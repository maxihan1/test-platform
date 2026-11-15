import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지, 보이나 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필열기 } from './helpers/nav.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-504',
  name: '새 계정 프로필 탭 줄에 「미디어」 · 「추천」 탭 노출 상태가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    미디어노출: z.boolean().describe('「미디어」 탭이 보이는지').default(true),
    추천노출: z.boolean().describe('「추천」 탭이 보이는지').default(true),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);
  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });
  await test.step('가입 직후 계정 qa_fresh 프로필을 연다', async () => {
    await 프로필열기(driver, 'qa_fresh');
    await verify('프로필 글 목록이 그려진다', await 뜰때까지(driver, 프로필.글목록, 15_000), true, { blocker: true });
    const 미디어 = await verify('프로필 탭 줄의 「미디어」 탭 노출 상태가 기대값과 같다', await 보이나(driver, 프로필.탭('미디어')), expected.미디어노출);
    const 추천 = await verify('프로필 탭 줄의 「추천」 탭 노출 상태가 기대값과 같다', await 보이나(driver, 프로필.탭('추천')), expected.추천노출);
    await verify('새 계정 프로필 탭 줄에 「미디어」 · 「추천」 탭 노출 상태가 보인다', 미디어 && 추천, true);
  });
});
