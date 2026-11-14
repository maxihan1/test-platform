import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글공유보내기 } from './helpers/onboarding.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 공유받기화면 } from './pages/share.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-528',
  name: '공유받기로 연 글쓰기를 닫으면 앱도 닫힌다',
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
  const 공유 = new 공유받기화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('앱에 글 공유를 보내 글쓰기를 연다', async () => {
    await 글공유보내기(driver, 'mta_share');
    await verify('글쓰기 화면이 보인다', await 공유.글쓰기떴나(), true, { blocker: true });
  });
  await test.step('공유받기로 연 글쓰기를 닫는다', async () => {
    await 공유.닫기();
    await verify('공유받기로 연 글쓰기를 닫으면 앱도 닫힌다', await 공유.앱이닫혔나(), true);
  }, { capture: true });
});
