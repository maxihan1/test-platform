import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';

import { 글쓰기화면 } from './pages/compose.page.js';
import { 공개범위시트 } from './pages/visibility-sheet.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-205',
  name: '공개 범위 시트에 「마스토돈 검색 결과, 트렌딩, 공개 타임라인에서 숨김」 · 「오직 팔로우 중인 사람들에게만」 · 「게시물에 반응한 사람들에게만」이 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    숨김: z.string().describe('제한적 공개 부제').default('마스토돈 검색 결과, 트렌딩, 공개 타임라인에서 숨김'),
    팔로워만: z.string().describe('팔로워 부제').default('오직 팔로우 중인 사람들에게만'),
    반응한사람: z.string().describe('개인 멘션 부제').default('게시물에 반응한 사람들에게만'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 글쓰기 = new 글쓰기화면(driver);
  const 시트 = new 공개범위시트(driver);

  await test.step('일반 회원으로 로그인해 글쓰기 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    await verify('글쓰기 화면 본문 칸이 보인다', await 글쓰기.열기(), true, { blocker: true });
  });

  await test.step('공개 범위 시트를 연다', async () => {
    await driver.$(글쓰기.공개범위버튼).click();
    await verify('공개 범위 시트가 열린다', await 시트.그려질때까지(), true, { blocker: true });

    await 시트.공개열기();
    const 숨김 = await verify('「마스토돈 검색 결과, 트렌딩, 공개 타임라인에서 숨김」이 보인다', await 시트.메뉴.뜰때까지(expected.숨김), true);
    const 팔로워만 = await verify('「오직 팔로우 중인 사람들에게만」이 보인다', await 시트.메뉴.뜰때까지(expected.팔로워만), true);
    const 반응 = await verify('「게시물에 반응한 사람들에게만」이 보인다', await 시트.메뉴.뜰때까지(expected.반응한사람), true);
    await verify('공개 범위 시트에 「마스토돈 검색 결과, 트렌딩, 공개 타임라인에서 숨김」 · 「오직 팔로우 중인 사람들에게만」 · 「게시물에 반응한 사람들에게만」이 보인다', 숨김 && 팔로워만 && 반응, true);
  });
});
