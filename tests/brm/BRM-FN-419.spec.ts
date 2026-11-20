import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 게임다시켜기, 지금화면 } from './helpers/game-enter.helper.js';
import { QA공지모두지우기, 공지만들기, 점검끄기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-419',
  name: '공지와 점검이 0건이면 공지 띠가 보이지 않는다',
  platforms: ['android'],
  precondition: ['켜진 공지와 점검이 없다', '[QA] 공지 1건이 켜져 있다'],
  techniques: ['경계값 분석'],
  elements: ['state:접속=로그아웃'],
  params: z.object({
    제한초: z.number().int().min(1).describe('공지가 보이기까지 허용 시간(초) — 기획서의 1분').default(60),
    오차초: z.number().min(0).describe('시간 재기 오차(초)').default(2),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  await test.cleanup('시험 공지 지우기 · 점검 끄기', async () => {
    await QA공지모두지우기(admin);
    await 점검끄기(admin);
  });
  await test.step('로그인 화면 공지 띠를 본다', async () => {
    await 게임다시켜기(game, driver);
    const 화면 = await 로그인화면.열기(game);
    await verify('로그인 화면이 보인다', await 지금화면(game), '로그인', { blocker: true });
    await verify('공지와 점검이 0건이면 공지 띠가 보이지 않는다', (await 화면.공지띠글()) === null, true);
    await 공지만들기(admin, '[QA] 공지 419', '공지 띠 경계 시험');
    await verify('공지 띠가 보인다', await 화면.공지띠뜸((params.제한초 + params.오차초) * 1000), true);
  });
});
