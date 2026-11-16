import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';

import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-176',
  name: '글쓰기 도구 줄에 「미디어 추가」 · 「투표 추가」 · 「에모지」 · 「열람 주의」 · 「언어」 · 공개 범위 버튼이 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 글쓰기 = new 글쓰기화면(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('글쓰기 화면을 연다', async () => {
    await verify('글쓰기 화면 본문 칸이 보인다', await 글쓰기.열기(), true, { blocker: true });
    const 미디어 = await verify('「미디어 추가」 버튼이 보인다', await 뜰때까지(driver, 글쓰기.버튼이름('미디어 추가'), 10_000), true);
    const 투표 = await verify('「투표 추가」 버튼이 보인다', await 뜰때까지(driver, 글쓰기.버튼이름('투표 추가'), 10_000), true);
    const 에모지 = await verify('「에모지」 버튼이 보인다', await 뜰때까지(driver, 글쓰기.버튼이름('에모지'), 10_000), true);
    const 열람 = await verify('「열람 주의」 버튼이 보인다', await 뜰때까지(driver, 글쓰기.버튼이름('열람 주의'), 10_000), true);
    const 언어 = await verify('「언어」 버튼이 보인다', await 뜰때까지(driver, 글쓰기.버튼이름('언어'), 10_000), true);
    const 공개 = await verify('공개 범위 버튼이 보인다', await 뜰때까지(driver, 글쓰기.공개범위버튼, 10_000), true);
    await verify('글쓰기 도구 줄에 「미디어 추가」 · 「투표 추가」 · 「에모지」 · 「열람 주의」 · 「언어」 · 공개 범위 버튼이 보인다', 미디어 && 투표 && 에모지 && 열람 && 언어 && 공개, true);
  });
});
