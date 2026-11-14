import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 계정설정화면 } from './pages/set-account.page.js';
import { 계정알림설정화면 } from './pages/set-notif.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-431',
  name: '알림 종류 체크 「언급과 답장」 · 「부스트」 · 「좋아함」 · 「새 팔로워」 · 「투표」 · 「새로운 게시물」 · 「인용」은 기본 모두 켜짐이다',
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
  const 알림 = new 계정알림설정화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('홈에서 설정을 연다', async () => {
    await verify('설정 화면에 「계정 추가...」 줄이 보인다', await 설정.열기(), true, { blocker: true });
  });
  await test.step('설정에서 계정 설정을 연다', async () => {
    await 설정.계정줄누르기();
    await verify('계정 설정 화면에 계정 이름 제목이 보인다', await 계정설정.떴나(), true, { blocker: true });
  });
  await test.step('계정 설정에서 「알림」을 누른다', async () => {
    await 계정설정.줄누르기('알림');
    await verify('알림 설정 화면이 열린다', await 알림.떴나(), true);
    const 언급 = await verify('「언급과 답장」이 켜져 있다', await 알림.켜졌나('언급과 답장'), true);
    const 부스트 = await verify('「부스트」가 켜져 있다', await 알림.켜졌나('부스트'), true);
    const 좋아함 = await verify('「좋아함」이 켜져 있다', await 알림.켜졌나('좋아함'), true);
    const 팔로워 = await verify('「새 팔로워」가 켜져 있다', await 알림.켜졌나('새 팔로워'), true);
    const 투표 = await verify('「투표」가 켜져 있다', await 알림.켜졌나('투표'), true);
    const 새글 = await verify('「새로운 게시물」이 켜져 있다', await 알림.켜졌나('새로운 게시물'), true);
    const 인용 = await verify('「인용」이 켜져 있다', await 알림.켜졌나('인용'), true);
    await verify('알림 종류 체크 「언급과 답장」 · 「부스트」 · 「좋아함」 · 「새 팔로워」 · 「투표」 · 「새로운 게시물」 · 「인용」은 기본 모두 켜짐이다', 언급 && 부스트 && 좋아함 && 팔로워 && 투표 && 새글 && 인용, true);
  }, { capture: true });
});
