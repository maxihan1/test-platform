import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 계정설정화면 } from './pages/set-account.page.js';
import { 게시기본값화면 } from './pages/set-posting.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-436',
  name: '「게시 범위」는 「공개」 · 「제한적 공개」 · 「팔로워」 가운데 고른다',
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
  const 설정 = new 설정화면(driver);
  const 계정설정 = new 계정설정화면(driver);
  const 게시 = new 게시기본값화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('설정에서 게시 기본값을 연다', async () => {
    await 설정.열기();
    await 설정.계정줄누르기();
    await 계정설정.줄누르기('게시 기본값');
    await verify('게시 기본값 화면에 「게시 범위」 줄이 보인다', await 게시.떴나(), true, { blocker: true });
  });
  await test.step('게시 기본값에서 「게시 범위」를 누른다', async () => {
    await 게시.줄누르기('게시 범위');
    const 제한 = await verify('선택지 「제한적 공개」가 보인다', await 게시.선택지보이나('제한적 공개'), true);
    const 팔로워 = await verify('선택지 「팔로워」가 보인다', await 게시.선택지보이나('팔로워'), true);
    const 공개 = await verify('선택지 「공개」가 보인다', (await 게시.글자수('공개')) >= 2, true);
    await verify('「게시 범위」는 「공개」 · 「제한적 공개」 · 「팔로워」 가운데 고른다', 제한 && 팔로워 && 공개, true);
    await 게시.선택지고르기('공개');
  }, { capture: true });
});
