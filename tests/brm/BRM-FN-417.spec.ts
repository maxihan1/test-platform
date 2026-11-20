import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 색뗀글 } from './components/hud.component.js';
import { 로그인공지띠에글이뜰때까지 } from './helpers/login-tools.helper.js';
import { 게임다시켜기, 지금화면 } from './helpers/game-enter.helper.js';
import { QA공지모두지우기, 공지만들기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-417',
  name: '공지가 둘이면 10초 뒤 다음 공지로 넘어간다',
  platforms: ['android'],
  precondition: ['[QA] 공지 두 개가 켜져 있다'],
  elements: ['state:접속=로그아웃'],
  params: z.object({
    넘김초: z.number().int().min(1).describe('다음 공지로 넘어가기까지 시간(초) — 기획서의 10초').default(10),
    오차초: z.number().min(0).describe('시간 재기 오차(초)').default(2),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  await test.cleanup('시험 공지 지우기', () => QA공지모두지우기(admin));
  let 화면: 로그인화면 | null = null;
  await test.step('공지 두 개를 켜고 로그인 화면을 연다', async () => {
    await 공지만들기(admin, '[QA] 417 첫째 공지', '공지 넘김 시험');
    await 공지만들기(admin, '[QA] 417 둘째 공지', '공지 넘김 시험');
    await 게임다시켜기(game, driver);
    화면 = await 로그인화면.열기(game);
    await verify('로그인 화면이 보인다', await 지금화면(game), '로그인', { blocker: true });
    await verify('로그인 화면 공지 띠가 보인다', await 화면.공지띠뜸(30_000), true, { blocker: true });
  });
  await test.step('공지 띠를 지켜본다', async () => {
    const 처음 = 색뗀글((await 화면?.공지띠글()) ?? '');
    const 다음 = 처음.includes('417 첫째') ? '417 둘째' : '417 첫째';
    await verify('공지 띠에 시험 공지 하나가 보인다', 처음.includes('417 첫째') || 처음.includes('417 둘째'), true, { blocker: true });
    const 넘어감 = await 로그인공지띠에글이뜰때까지(game, 다음, (params.넘김초 + params.오차초) * 1000);
    await verify('공지가 둘이면 10초 뒤 다음 공지로 넘어간다', 넘어감, true);
  });
});
