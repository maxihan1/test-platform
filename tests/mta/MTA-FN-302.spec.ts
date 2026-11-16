import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지, 사라질때까지, 보이나 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';

import { 알림화면 } from './pages/notifications.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-302',
  name: '알림 화면에서 「멘션」 탭을 누르면 팔로우 알림이 보이지 않고 멘션 알림만 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    팔로우글: z.string().describe('팔로우 알림 글').default('님이 나를 팔로우했습니다'),
    요청글: z.string().describe('팔로우 요청 알림 글').default('님이 나에게 팔로우 요청을 보냄'),
    인용글: z.string().describe('인용 알림 글').default('당신의 게시물을 인용했습니다'),
    부스트글: z.string().describe('부스트 알림 글').default('님이 부스트했습니다'),
    즐겨찾기글: z.string().describe('즐겨찾기 알림 글').default('즐겨찾기'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 알림 = new 알림화면(driver);

  await test.step('일반 회원으로 로그인해 알림 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    await verify('알림 화면이 열린다', await 알림.열기(), true, { blocker: true });
  });

  await test.step('알림 화면에서 「멘션」 탭을 누른다', async () => {
    await 알림.멘션탭누르기();
    const 팔로우없음 = await verify('팔로우 알림이 보이지 않는다', await 사라질때까지(driver, 알림.목록글자포함(expected.팔로우글), 10_000), true);
    const 멘션있음 = await verify('멘션 알림 글 카드가 보인다', await 뜰때까지(driver, 알림.글카드답장, 15_000), true);
    const 요청 = await 보이나(driver, 알림.목록글자포함(expected.요청글));
    const 인용 = await 보이나(driver, 알림.목록글자포함(expected.인용글));
    const 부스트 = await 보이나(driver, 알림.목록글자포함(expected.부스트글));
    const 즐겨찾기 = await 보이나(driver, 알림.목록글자포함(expected.즐겨찾기글));
    const 다른없음 = await verify('요청 · 인용 · 부스트 · 즐겨찾기 알림이 보이지 않는다', 요청 || 인용 || 부스트 || 즐겨찾기, false);
    await verify('알림 화면에서 「멘션」 탭을 누르면 팔로우 알림이 보이지 않고 멘션 알림만 보인다', 팔로우없음 && 멘션있음 && 다른없음, true);
  });
});
