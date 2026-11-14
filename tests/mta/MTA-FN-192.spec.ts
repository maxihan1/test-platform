import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 더보기항목들 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-192',
  name: '내 글을 인용하지 않은 남의 글 더보기를 열면 내 글을 인용하지 않은 남의 글 더보기에는 「의 게시물에서 나의 게시물을 제거합니다」가 보이지 않는다',
  platforms: ['android'],
  techniques: ['동등 분할'],
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
  await test.step('내 글을 인용하지 않은 남의 글 더보기를 연다', async () => {
    const 항목들 = await 더보기항목들(driver, '마스토돈 4.7 인용 기능');
    await verify('내 글을 인용하지 않은 남의 글 더보기를 열면 내 글을 인용하지 않은 남의 글 더보기에는 「의 게시물에서 나의 게시물을 제거합니다」가 보이지 않는다', 항목들.some((항목) => 항목.includes('의 게시물에서 나의 게시물을 제거합니다')), false);
  }, { capture: true });
});
