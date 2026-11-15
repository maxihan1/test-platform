import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지, 될때까지, 칸에적기 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';
import { 프로필편집화면 } from './pages/profile-edit.page.js';
import { 알림글 } from './components/toast.component.js';

export const spec = defineCase({
  tcId: 'MTA-FN-419',
  name: '자기소개 501자로 「저장」을 누르면 오류 토스트가 보인다',
  platforms: ['android'],
  precondition: ['프로필 고쳐도 되는 계정으로 로그인해 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    loginId: z.string().describe('프로필 고쳐도 되는 계정 아이디').optional().meta({ secret: true, account: '프로필 고쳐도 되는 계정' }),
    loginPassword: z.string().describe('프로필 고쳐도 되는 계정 비밀번호').optional().meta({ secret: true, account: '프로필 고쳐도 되는 계정' }),
    글자수: z.number().int().describe('자기소개 칸에 적는 글자 수 — 501 이상 600 이하').default(501),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);
  const 편집 = new 프로필편집화면(driver);
  const 알림 = new 알림글(driver);
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
  await test.step('자기소개 501자로 「저장」을 누른다', async () => {
    await 칸에적기(await driver.$(편집.자기소개칸).getElement(), 'a'.repeat(params.글자수));
    await verify('저장 버튼이 켜진다', await 될때까지(driver, () => 편집.저장켜졌나(), 5_000), true, { blocker: true });
    await driver.$(편집.저장).click();
    await verify('자기소개 501자로 「저장」을 누르면 오류 토스트가 보인다', (await 알림.토스트(10_000)) !== '', true);
  });
});
