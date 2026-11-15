import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 계정줄 } from './helpers/app.helper.js';
import { 설정줄열기, 계정설정열기 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-436',
  name: '「게시 범위」를 누르면 「공개」 · 「제한적 공개」 · 「팔로워」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    선택1: z.string().describe('게시 범위 선택지').default('공개'),
    선택2: z.string().describe('게시 범위 선택지').default('제한적 공개'),
    선택3: z.string().describe('게시 범위 선택지').default('팔로워'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 설정 = new 설정화면(driver);
  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });
  await test.step('계정 설정을 연다', async () => {
    await verify('계정 설정이 열린다', await 계정설정열기(driver, 계정줄(params.loginId ?? '')), true, { blocker: true });
  });
  await test.step('계정 설정에서 「게시 기본값」을 연다', async () => {
    await verify('게시 기본값 화면이 열린다', await 설정줄열기(driver, '게시 기본값'), true, { blocker: true });
  });
  await test.step('게시 기본값에서 「게시 범위」를 누른다', async () => {
    await 설정.줄누르기('게시 범위');
    const 보임1 = await verify('「게시 범위」 선택지에 「공개」가 보인다', await 뜰때까지(driver, 설정.화면글정확히(expected.선택1), 10_000), true);
    const 보임2 = await verify('「게시 범위」 선택지에 「제한적 공개」가 보인다', await 뜰때까지(driver, 설정.화면글정확히(expected.선택2), 10_000), true);
    const 보임3 = await verify('「게시 범위」 선택지에 「팔로워」가 보인다', await 뜰때까지(driver, 설정.화면글정확히(expected.선택3), 10_000), true);
    await verify('「게시 범위」를 누르면 「공개」 · 「제한적 공개」 · 「팔로워」가 보인다', 보임1 && 보임2 && 보임3, true);
  });
});
