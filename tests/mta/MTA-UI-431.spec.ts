import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정줄 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정설정열기, 설정줄열기 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 알림설정화면 } from './pages/notify-settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-431',
  name: '알림 종류 「언급과 답장」 · 「부스트」 · 「좋아함」 · 「새 팔로워」 · 「투표」 · 「새로운 게시물」 · 「인용」이 모두 켜져 보인다',
  platforms: ['android'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    언급글: z.string().describe('알림 종류 이름').default('언급과 답장'),
    부스트글: z.string().describe('알림 종류 이름').default('부스트'),
    좋아함글: z.string().describe('알림 종류 이름').default('좋아함'),
    팔로워글: z.string().describe('알림 종류 이름').default('새 팔로워'),
    투표글: z.string().describe('알림 종류 이름').default('투표'),
    게시물글: z.string().describe('알림 종류 이름').default('새로운 게시물'),
    인용글: z.string().describe('알림 종류 이름').default('인용'),
    켜짐: z.boolean().describe('알림 종류가 켜져 보이는지').default(true),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 알림 = new 알림설정화면(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('새로 로그인한 앱의 알림 설정을 연다', async () => {
    await verify('계정 설정이 열린다', await 계정설정열기(driver, 계정줄(params.loginId ?? '')), true, { blocker: true });
    await verify('알림 설정이 열린다', await 설정줄열기(driver, '알림'), true, { blocker: true });
    await verify('알림 종류 줄이 보인다', await 알림.종류그려질때까지(expected.언급글), true, { blocker: true });
    const 언급 = await verify('「언급과 답장」이 켜져 보인다', await 알림.켜졌나(expected.언급글), expected.켜짐);
    const 부스트 = await verify('「부스트」가 켜져 보인다', await 알림.켜졌나(expected.부스트글), expected.켜짐);
    const 좋아함 = await verify('「좋아함」이 켜져 보인다', await 알림.켜졌나(expected.좋아함글), expected.켜짐);
    const 팔로워 = await verify('「새 팔로워」가 켜져 보인다', await 알림.켜졌나(expected.팔로워글), expected.켜짐);
    const 투표 = await verify('「투표」가 켜져 보인다', await 알림.켜졌나(expected.투표글), expected.켜짐);
    const 게시물 = await verify('「새로운 게시물」이 켜져 보인다', await 알림.켜졌나(expected.게시물글), expected.켜짐);
    const 인용 = await verify('「인용」이 켜져 보인다', await 알림.켜졌나(expected.인용글), expected.켜짐);
    await verify('알림 종류 「언급과 답장」 · 「부스트」 · 「좋아함」 · 「새 팔로워」 · 「투표」 · 「새로운 게시물」 · 「인용」이 모두 켜져 보인다', 언급 && 부스트 && 좋아함 && 팔로워 && 투표 && 게시물 && 인용, true);
  });
});
