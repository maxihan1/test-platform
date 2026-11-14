import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 더보기항목들, 메뉴에있나 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-156',
  name: '내가 팔로우하는 사람의 글 더보기에 「목록에서 추가 또는 제거」가 보인다',
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

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('팔로우하는 jiho_cafe 글의 더보기를 연다', async () => {
    const 항목들 = await 더보기항목들(driver, '오늘의 카페 추천');
    await verify('내가 팔로우하는 사람의 글 더보기에 「목록에서 추가 또는 제거」가 보인다', 메뉴에있나(항목들, '목록에서 추가 또는 제거'), true);
  }, { capture: true });
});
