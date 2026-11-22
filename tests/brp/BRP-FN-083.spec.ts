import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 스탯읽기 } from './helpers/dungeon.helper.js';
import { 갈래B값될때까지 } from './helpers/dungeon-wait.helper.js';
import { 로그인하기, 던전입장 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 로비로되돌리기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-083',
  name: '「스킬 1」 버튼을 누르면 직업의 두 번째 스킬을 써 탱커는 /gm stat 쓴 스킬이 「방패 오라」다',
  platforms: ['windows'],
  precondition: ['일반 회원이 탱커로 혼자 던전에 들어와 있다'],
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
  await test.step('「스킬 1」을 누른다', async () => {
    const 던전 = await 던전화면.열림(game);
    await 던전.스킬1누르기();
    const 쓴스킬 = await 갈래B값될때까지(async () => (await 스탯읽기(game))['쓴스킬'] ?? '', (값) => 값 === '방패 오라', 20_000);
    await verify('「스킬 1」 버튼을 누르면 직업의 두 번째 스킬을 써 탱커는 /gm stat 쓴 스킬이 「방패 오라」다', 쓴스킬, '방패 오라');
  });
});
