import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지, 칸에적기 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';
import { 프로필편집화면 } from './pages/profile-edit.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-404',
  name: '「Display name」 칸에 30자를 적으면 30자가 그대로 들어간다',
  platforms: ['android'],
  precondition: ['프로필 고쳐도 되는 계정으로 로그인해 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('프로필 고쳐도 되는 계정 아이디').optional().meta({ secret: true, account: '프로필 고쳐도 되는 계정' }),
    loginPassword: z.string().describe('프로필 고쳐도 되는 계정 비밀번호').optional().meta({ secret: true, account: '프로필 고쳐도 되는 계정' }),
    안쪽글자수: z.number().int().describe('「Display name」 칸에 적는 글자 수(경계 안쪽) — 1 이상 30 이하').default(30),
    바깥글자수: z.number().int().describe('「Display name」 칸에 적는 글자 수(경계 바깥) — 31 이상').default(31),
  }),
  expected: z.object({
    안쪽들어간수: z.number().int().describe('경계 안쪽을 적었을 때 들어간 글자 수').default(30),
    바깥들어간수: z.number().int().describe('경계 바깥을 적었을 때 들어간 글자 수').default(30),
  }),
});

test(spec, async ({ driver, params, expected }) => {
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
  await test.step('프로필 편집에서 「Display name」 칸을 연다', async () => {
    await 편집.줄누르기('Display name');
    await verify('「Display name」 편집 칸이 보인다', await 뜰때까지(driver, 편집.이름칸, 10_000), true, { blocker: true });
  });
  await test.step('「Display name」 칸에 30자를 적는다', async () => {
    await 칸에적기(await driver.$(편집.이름칸).getElement(), 'a'.repeat(params.안쪽글자수));
    await verify('「Display name」 칸에 30자를 적으면 30자가 그대로 들어간다', (await driver.$(편집.이름칸).getText()).length, expected.안쪽들어간수);
  });
  await test.step('「Display name」 칸에 31자를 적는다', async () => {
    await 칸에적기(await driver.$(편집.이름칸).getElement(), 'a'.repeat(params.바깥글자수));
    await verify('31자에서는 30자까지만 들어간다', (await driver.$(편집.이름칸).getText()).length, expected.바깥들어간수);
  });
});
