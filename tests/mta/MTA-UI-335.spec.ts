import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필열기 } from './helpers/nav.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-335',
  name: '개인 메모를 써 둔 사람 프로필 메뉴에 「Edit personal note」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    메모글: z.string().describe('프로필 메뉴 항목').default('Edit personal note'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);
  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });
  await test.step('개인 메모를 써 둔 minjun_dev 프로필 메뉴를 연다', async () => {
    await 프로필열기(driver, 'minjun_dev');
    await 프로필.메뉴열기();
    const 항목1 = await verify('프로필 메뉴에 「Edit personal note」가 보인다', await 프로필.메뉴.뜰때까지(expected.메모글), true);
    await verify('개인 메모를 써 둔 사람 프로필 메뉴에 「Edit personal note」가 보인다', 항목1, true);
  });
});
