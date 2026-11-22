import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 점검끄기, 점검바꾸기, QA공지모두지우기 } from './helpers/game-state.helper.js';
import { type 색, 빨강인가 } from './helpers/screen-check.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-416',
  name: '점검이 걸리면 공지 띠에 공지 대신 「[점검]」 글이 보인다',
  platforms: ['windows'],
  precondition: ['허용 계정 없는 점검이 켜져 있다'],
  params: z.object({
    maintenanceMessage: z.string().describe('점검 안내 글').default('[QA] 점검 중입니다'),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 안내 = params.maintenanceMessage;
  await test.cleanup('[QA] 공지를 지우고 점검을 끄기', async () => {
    await QA공지모두지우기(admin);
    await 점검끄기(admin);
  });

  await test.step('허용 계정 없는 점검을 켜고 게임을 다시 켠 것을 확인한다', async () => {
    await 점검바꾸기(admin, { enabled: true, message: 안내, allowedAccountIds: [] });
    await game.restart();
    const 화면 = await 로그인화면.열림(game);
    await verify('로그인 화면 공지 띠가 뜬다', await 화면.공지띠뜰때까지(30_000), true, { blocker: true });
  });

  await test.step('로그인 화면 공지 띠를 읽는다', async () => {
    const 화면 = await 로그인화면.열림(game);
    await verify('점검이 걸리면 공지 띠에 공지 대신 「[점검]」 글이 보인다', (await 화면.공지띠글기다리기('[점검]')).includes('[점검]'), true);
    await verify('점검 공지 띠 바탕은 빨간색이다', 빨강인가((await 화면.공지띠바탕색()) as 색), true);
  });
});
