import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-008',
  name: '홈 화면에서 상단 드롭다운을 누르면 「홈」 · 「실시간 피드」 · 「목록」 · 「팔로우 중인 해시태그」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('홈 상단 드롭다운을 누른다', async () => {
    await 홈.드롭다운열기();
    const 실시간 = await verify('「실시간 피드」가 보인다', await 홈.메뉴.뜰때까지('실시간 피드'), true);
    const 목록 = await verify('「목록」이 보인다', await 홈.메뉴.뜰때까지('목록'), true);
    const 해시태그 = await verify('「팔로우 중인 해시태그」가 보인다', await 홈.메뉴.뜰때까지('팔로우 중인 해시태그'), true);
    const 홈항목 = await verify('「홈」이 보인다', await 홈.메뉴.뜰때까지('홈'), true);
    await verify('홈 화면에서 상단 드롭다운을 누르면 「홈」 · 「실시간 피드」 · 「목록」 · 「팔로우 중인 해시태그」가 보인다', 실시간 && 목록 && 해시태그 && 홈항목, true);
  });
});
