import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';

import { 검색화면 } from './pages/search.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-348',
  name: '검색에 도메인 없는 「@hana_photo」를 적으면 「@hana_photo@mastodon.maxihan.com로 이동」 줄이 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    검색어: z.string().min(1).describe('검색에 적을 계정 — 도메인 없는 골뱅이 계정').default('@hana_photo'),
  }),
  expected: z.object({
    줄글: z.string().describe('계정 이동 줄 글').default('@hana_photo@mastodon.maxihan.com로 이동'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 검색 = new 검색화면(driver);

  await test.step('일반 회원으로 로그인해 검색 입력 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    await verify('검색 입력 화면이 열린다', await 검색.열기(), true, { blocker: true });
  });

  await test.step('검색에 「@hana_photo」를 적는다', async () => {
    await 검색.적기(params.검색어);
    const 줄0 = await verify('「@hana_photo@mastodon.maxihan.com로 이동」 줄이 보인다', await 뜰때까지(driver, 검색.행(expected.줄글), 15_000), true);
    await verify('검색에 도메인 없는 「@hana_photo」를 적으면 「@hana_photo@mastodon.maxihan.com로 이동」 줄이 보인다', 줄0, true);
  });
});
