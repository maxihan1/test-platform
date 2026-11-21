import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전으로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 불러내기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-103',
  name: '항아리를 불러 들고 내려놓으면 탱커도 「들기」와 「내려놓기」를 써서 항아리를 들고 내려놓을 수 있다',
  platforms: ['android'],
  precondition: ['일반 회원이 혼자 던전에 들어와 있다'],
  elements: ['class:탱커', 'skill:들기', 'skill:내려놓기'],
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
  await test.step('항아리를 불러 들고 내려놓는다', async () => {
    const 던전 = await 던전화면.열기(game);
    await 불러내기(game, 'pot');
    await verify('항아리가 떠 있다', await 던전.항아리뜰때까지(), true, { blocker: true });
    await 던전.항아리고르기();
    await verify('항아리를 고르면 「공격」 버튼 그림이 「들기」로 바뀐다', await 던전.행동버튼그림이될때까지('공격', 던전화면.그림.들기, 10_000), true, { blocker: true });
    await 던전.누르기('공격');
    const 들음 = await verify('탱커가 「들기」로 항아리를 든다', await 던전.행동버튼그림이될때까지('공격', 던전화면.그림.내려놓기, 15_000), true);
    await 던전.누르기('공격');
    const 내려놓음 = await verify('탱커가 「내려놓기」로 항아리를 내려놓는다', await 던전.행동버튼그림이될때까지('공격', 던전화면.그림.탱커기본, 15_000), true);
    await verify('항아리를 불러 들고 내려놓으면 탱커도 「들기」와 「내려놓기」를 써서 항아리를 들고 내려놓을 수 있다', 들음 && 내려놓음, true);
  });
});
