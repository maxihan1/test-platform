import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전으로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 불러내기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-093',
  name: '항아리를 들고 있으면 「공격」 버튼 그림이 「내려놓기」로 바뀐다',
  platforms: ['android'],
  precondition: ['일반 회원이 혼자 던전에 들어와 있다'],
  elements: ['skill:들기', 'skill:내려놓기'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  await test.cleanup('켜 둔 봇 끄기 · 일반 회원 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
  });
  await test.step('일반 회원이 혼자 던전에 들어간다', async () => {
    await 던전으로(game, driver, 나, 0);
    await verify('던전 화면이 보인다', await 지금화면(game), '던전', { blocker: true });
  });
  await test.step('항아리를 불러 들어 올린다', async () => {
    const 던전 = await 던전화면.열기(game);
    await 불러내기(game, 'pot');
    await verify('항아리가 떠 있다', await 던전.항아리뜰때까지(), true, { blocker: true });
    await 던전.항아리고르기();
    await 던전.누르기('공격');
    await verify('항아리를 들고 있으면 「공격」 버튼 그림이 「내려놓기」로 바뀐다', await 던전.행동버튼그림이될때까지('공격', 던전화면.그림.내려놓기, 15_000), true);
  });
});
