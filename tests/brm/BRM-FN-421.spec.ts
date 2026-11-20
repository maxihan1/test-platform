import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인공지띠에글이남는가 } from './helpers/login-tools.helper.js';
import { 게임다시켜기, 지금화면 } from './helpers/game-enter.helper.js';
import { QA공지모두지우기, 공지만들기, 실패걸기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-421',
  name: '공지 읽기에 실패하면 공지 띠에 바로 전에 읽은 [QA] 공지가 그대로 보인다',
  platforms: ['android'],
  precondition: ['[QA] 공지가 로그인 화면에 보이고 다음 서버 상태 읽기 요청 하나가 실패하도록 걸려 있다'],
  techniques: ['동등 분할'],
  elements: ['state:접속=로그아웃'],
  params: z.object({
    읽기주기초: z.number().int().min(1).describe('공지를 다시 읽는 주기(초) — 기획서의 1분').default(60),
    오차초: z.number().min(0).describe('시간 재기 오차(초)').default(2),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  await test.cleanup('시험 공지 지우기', () => QA공지모두지우기(admin));
  await test.step('공지를 켜고 로그인 화면 공지 띠에 보이게 한다', async () => {
    await 공지만들기(admin, '[QA] 421 공지', '공지 읽기 실패 시험');
    await 게임다시켜기(game, driver);
    const 화면 = await 로그인화면.열기(game);
    await verify('로그인 화면이 보인다', await 지금화면(game), '로그인', { blocker: true });
    await verify('로그인 화면 공지 띠에 [QA] 공지가 보인다', await 화면.공지띠뜸(30_000), true, { blocker: true });
  });
  await test.step('다음 공지 읽기까지 기다린다', async () => {
    await 실패걸기(admin, '/api/serverstatus');
    const 남음 = await 로그인공지띠에글이남는가(game, '421 공지', (params.읽기주기초 + params.오차초) * 1000);
    await verify('공지 읽기에 실패하면 공지 띠에 바로 전에 읽은 [QA] 공지가 그대로 보인다', 남음, true);
  });
});
