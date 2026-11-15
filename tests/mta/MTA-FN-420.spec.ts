import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지, 될때까지, 칸에적기 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';
import { 프로필편집화면 } from './pages/profile-edit.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-420',
  name: '자기소개 편집에서 입력을 한 번 바꾸면 「저장」이 켜진다',
  platforms: ['android'],
  precondition: ['프로필 고쳐도 되는 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('프로필 고쳐도 되는 계정 아이디').optional().meta({ secret: true, account: '프로필 고쳐도 되는 계정' }),
    loginPassword: z.string().describe('프로필 고쳐도 되는 계정 비밀번호').optional().meta({ secret: true, account: '프로필 고쳐도 되는 계정' }),
    덧붙일글: z.string().min(1).describe('자기소개 칸에 적는 글 — 비우지 않는다').default('a'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);
  const 편집 = new 프로필편집화면(driver);
  await test.step('프로필 고쳐도 되는 계정으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });
  await test.step('내 프로필에서 「프로필 편집」을 연다', async () => {
    await 홈.탭.누르기('프로필');
    await verify('내 프로필 화면이 그려진다', await 프로필.그려질때까지(), true, { blocker: true });
    await 프로필.동작누르기();
    await verify('프로필 편집 화면이 그려진다', await 편집.그려질때까지(), true, { blocker: true });
  });
  await test.step('프로필 편집에서 자기소개 칸을 연다', async () => {
    await 편집.줄누르기('Add bio');
    await verify('자기소개 편집 칸이 보인다', await 뜰때까지(driver, 편집.자기소개칸, 10_000), true, { blocker: true });
  });
  await test.step('자기소개 편집에서 글자 하나를 더한다', async () => {
    await 칸에적기(await driver.$(편집.자기소개칸).getElement(), params.덧붙일글);
    await verify('자기소개 편집에서 입력을 한 번 바꾸면 「저장」이 켜진다', await 될때까지(driver, () => 편집.저장켜졌나(), 5_000), true);
  });
});
