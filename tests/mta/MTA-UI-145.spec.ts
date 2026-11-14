import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 뒤로, 프로필열기 } from './helpers/app.helper.js';
import { 부스트시트에서문구찾기 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-145',
  name: '인용할 수 없는 글의 부스트 시트에는 「오직 팔로워만 이 게시물을 인용할 수 있습니다.」 또는 「You are not allowed to quote this post」가 보인다',
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
  await test.step('seoyeon_books 의 인용 불가 글에서 「부스트」를 누른다', async () => {
    await 프로필열기(driver, 'seoyeon_books');
    const 찾음 = await 부스트시트에서문구찾기(driver, ['오직 팔로워만 이 게시물을 인용할 수 있습니다.', 'You are not allowed to quote this post']);
    await verify('인용할 수 없는 글의 부스트 시트에는 「오직 팔로워만 이 게시물을 인용할 수 있습니다.」 또는 「You are not allowed to quote this post」가 보인다', 찾음, true);
    await 뒤로(driver);
  }, { capture: true });
});
