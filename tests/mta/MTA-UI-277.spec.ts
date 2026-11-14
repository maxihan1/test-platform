import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 문구가보이나 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 둘러보기화면 } from './pages/explore.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-277',
  name: '둘러보기 「게시물」 탭에 안내 「당신이 속한 마스토돈 서버에서 관심을 끌고 있는 게시물들입니다.」와 서버 유행 글이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 탐색 = new 둘러보기화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('「둘러보기」 탭을 연다', async () => {
    await 탐색.열기();
    const 판정1 = await verify('「게시물」 탭에 안내 「당신이 속한 마스토돈 서버에서 관심을 끌고 있는 게시물들입니다.」가 보인다', await 문구가보이나(driver, '당신이 속한 마스토돈 서버에서 관심을 끌고 있는 게시물들입니다.'), true);
    const 판정2 = await verify('「게시물」 탭에 서버 유행 글이 하나 이상 보인다', await 탐색.보이나(탐색.글본문들), true);
    await verify('둘러보기 「게시물」 탭에 안내 「당신이 속한 마스토돈 서버에서 관심을 끌고 있는 게시물들입니다.」와 서버 유행 글이 보인다', 판정1 && 판정2, true);
  }, { capture: true });
});
