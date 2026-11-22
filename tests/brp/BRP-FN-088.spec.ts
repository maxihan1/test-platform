import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 그림들 } from './helpers/dungeon.helper.js';
import { 로그인하기, 던전입장 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 로비로되돌리기 } from './helpers/game-state.helper.js';
import { GM모두처치, GM항아리불러내기 } from './helpers/gm.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-088',
  name: '들 수 있는 물건을 고르면 「공격」 버튼 그림이 「들기」로 바뀐다',
  platforms: ['windows'],
  precondition: ['일반 회원이 탱커로 던전에 있고 곁에 들 수 있는 항아리를 불러 두었다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
  await test.cleanup('방을 로비로 돌리고 일반 회원을 기준 상태로 되돌리기', async () => {
    await 로비로되돌리기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  });

  await test.step('일반 회원이 탱커로 던전에 들어온 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
    await 던전입장(game, '탱커');
    await verify('던전 행동 막대가 보인다', (await game.find(던전화면.행동막대)) !== null, true, { blocker: true });
  });
  await test.step('적을 모두 치우고 항아리를 불러 둔 것을 확인한다', async () => {
    await GM모두처치(game);
    await GM항아리불러내기(game);
    const 던전 = await 던전화면.열림(game);
    await verify('불러낸 항아리가 보인다', await 던전.항아리있나(), true, { blocker: true });
  });
  await test.step('항아리를 클릭해 고른다', async () => {
    const 던전 = await 던전화면.열림(game);
    await 던전.대상고르기(던전화면.항아리, () => 던전.버튼그림될때까지(0, 그림들.들기, 1_500));
    await verify('들 수 있는 물건을 고르면 「공격」 버튼 그림이 「들기」로 바뀐다', await 던전.버튼그림될때까지(0, 그림들.들기), true);
  });
});
