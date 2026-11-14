import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 프로필열기 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 차단시트 } from './pages/block-sheet.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-370',
  name: '팔로워 제거는 영어 확인 창 「Remove follower?」를 묻는다',
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
  const 시트 = new 차단시트(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('qa_user2 프로필을 연다', async () => {
    await 프로필열기(driver, 'qa_user2');
    await verify('qa_user2 프로필 화면이 보인다', await 시트.프로필떴나(), true, { blocker: true });
  });
  await test.step('qa_user2 프로필 메뉴에서 「Remove follower」를 누른다', async () => {
    const 열림 = await verify('확인 창이 뜬다', await 시트.팔로워제거창열기(), true);
    const 제목 = await verify('확인 창에 「Remove follower?」가 보인다', await 시트.팔로워제거창에글있나('Remove follower?'), true);
    await verify('팔로워 제거는 영어 확인 창 「Remove follower?」를 묻는다', 열림 && 제목, true);
    await 시트.팔로워제거창닫기();
  }, { capture: true });
});
