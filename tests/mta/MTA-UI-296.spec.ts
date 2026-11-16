import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 해시태그열기 } from './helpers/nav.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 해시태그화면 } from './pages/hashtag.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-296',
  name: '해시태그 타임라인에 제목 「#오늘의사진」 · 「게시물」 수 · 「명의 참여자」 · 「팔로잉」 버튼이 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    태그: z.string().min(1).describe('열어 볼 해시태그 — 샵 기호 없는 낱말, 이 회원이 팔로우 중인 것').default('오늘의사진'),
  }),
  expected: z.object({
    제목글: z.string().describe('해시태그 타임라인 제목').default('#오늘의사진'),
    게시물글: z.string().describe('요약에 보이는 글').default('게시물'),
    참여자글: z.string().describe('요약에 보이는 글').default('명의 참여자'),
    버튼글: z.string().describe('팔로우 중인 해시태그의 버튼 글').default('팔로잉'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 화면 = new 해시태그화면(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('#오늘의사진 해시태그 타임라인을 연다', async () => {
    await verify('해시태그 검색 결과에서 타임라인이 열린다', await 해시태그열기(driver, params.태그), true, { blocker: true });
    await verify('해시태그 타임라인 제목이 그려진다', await 화면.그려질때까지(), true, { blocker: true });
  });

  await test.step('해시태그 타임라인 머리를 확인한다', async () => {
    const 제목 = await verify('제목이 「#오늘의사진」이다', await 화면.제목글(), expected.제목글);
    const 게시물 = await verify('요약에 「게시물」이 보인다', (await 화면.요약글()).includes(expected.게시물글), true);
    const 참여자 = await verify('요약에 「명의 참여자」가 보인다', (await 화면.요약글()).includes(expected.참여자글), true);
    const 버튼 = await verify('동작 버튼이 「팔로잉」이다', await 화면.동작글(), expected.버튼글);
    await verify('해시태그 타임라인에 제목 「#오늘의사진」 · 「게시물」 수 · 「명의 참여자」 · 「팔로잉」 버튼이 보인다', 제목 && 게시물 && 참여자 && 버튼, true);
  });
});
