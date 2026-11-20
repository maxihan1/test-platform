import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공지띠줄수 } from './helpers/login-tools.helper.js';
import { 게임다시켜기, 지금화면 } from './helpers/game-enter.helper.js';
import { QA공지모두지우기, 공지만들기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-416',
  name: '공지 띠의 줄 수를 읽으면 긴 공지도 공지 띠에 한 줄로 보인다',
  platforms: ['android'],
  precondition: ['긴 본문의 [QA] 공지가 켜져 있다'],
  elements: ['state:접속=로그아웃'],
  params: z.object({
    본문: z.string().min(80).describe('공지 본문 — 한 줄 폭을 훨씬 넘는 긴 글').default('아주 긴 시험 공지 본문입니다. '.repeat(8)),
  }),
  expected: z.object({
    줄수: z.number().int().describe('공지 띠 줄 수').default(1),
  }),
});

test(spec, async ({ game, driver, admin, params, expected }) => {
  await test.cleanup('시험 공지 지우기', () => QA공지모두지우기(admin));
  let 화면: 로그인화면 | null = null;
  await test.step('긴 공지를 켜고 로그인 화면을 연다', async () => {
    await 공지만들기(admin, '[QA] 공지 416', params.본문);
    await 게임다시켜기(game, driver);
    화면 = await 로그인화면.열기(game);
    await verify('로그인 화면이 보인다', await 지금화면(game), '로그인', { blocker: true });
    await verify('로그인 화면 공지 띠가 보인다', (await 화면.공지띠뜸(30_000)), true, { blocker: true });
  });
  await test.step('공지 띠의 줄 수를 읽는다', async () => {
    await verify('공지 띠의 줄 수를 읽으면 긴 공지도 공지 띠에 한 줄로 보인다', await 공지띠줄수(game), expected.줄수);
  });
});
