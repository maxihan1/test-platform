import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';
import { 보관함화면 } from './pages/saved-posts.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-363',
  name: '「보관함」 화면 위에 「당신이 저장한 게시물은 오직 당신에게만 보입니다.」가 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    안내글: z.string().describe('보관함 화면 위 안내').default('당신이 저장한 게시물은 오직 당신에게만 보입니다.'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);
  const 보관함 = new 보관함화면(driver);
  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });
  await test.step('내 프로필 메뉴에서 「보관함」을 연다', async () => {
    await 홈.탭.누르기('프로필');
    await verify('내 프로필 화면이 그려진다', await 프로필.그려질때까지(), true, { blocker: true });
    await 프로필.메뉴열기();
    await 프로필.메뉴항목누르기('보관함');
    await verify('「보관함」 화면 위에 「당신이 저장한 게시물은 오직 당신에게만 보입니다.」가 보인다', await 보관함.안내뜰때까지(expected.안내글), true);
  });
});
